const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const Groq = require("groq-sdk");
const Note = require("../models/Note");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or image files are allowed."), false);
    }
  },
});

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];

async function callGroq(systemPrompt, userContent, maxTokens = 1500, temperature = 0.3) {
  for (const model of GROQ_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      if (model !== GROQ_MODELS[0]) console.log("Notes: used fallback model " + model);
      return response.choices[0].message.content;
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.includes("rate_limit");
      if (isRateLimit) continue;
      throw err;
    }
  }
  throw new Error("All Groq models rate limited.");
}

function safeParseJSON(raw, label) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    throw new Error(label + ": AI returned invalid JSON - " + err.message);
  }
}

async function fetchWebContext(topic) {
  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: topic, num: 8 },
      { headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" } }
    );
    const results = response.data?.organic || [];
    const answerBox = response.data?.answerBox?.answer || response.data?.answerBox?.snippet || "";
    const knowledgeGraph = response.data?.knowledgeGraph?.description || "";
    if (results.length === 0 && !answerBox) return "";
    let context = "";
    if (answerBox) context += "DIRECT ANSWER: " + answerBox + "\n";
    if (knowledgeGraph) context += "KNOWLEDGE: " + knowledgeGraph + "\n";
    context += results.map((r) => "- " + r.title + ": " + r.snippet).join("\n");
    return context;
  } catch (err) {
    console.warn("Notes web search failed:", err.message);
    return "";
  }
}

async function extractSourceText(file) {
  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (file.mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(file.buffer, "eng");
    return result.data.text;
  }
  throw new Error("Unsupported file type.");
}

function groundingBlock(mode, groundingContext) {
  if (!groundingContext) return "";
  return mode === "file"
    ? "SOURCE TEXT - use ONLY this, do not add outside facts:\n" + groundingContext
    : "VERIFIED WEB FACTS - ground your content in these, do not contradict or invent beyond them:\n" + groundingContext;
}

async function generateOutline(topic, mode, groundingContext) {
  const systemPrompt = `
You are an expert study-notes planner.

${groundingBlock(mode, groundingContext)}

Topic: ${topic}

Return ONLY a JSON array of 5-8 section heading strings covering the topic real breadth - no filler, no padding.
Example: ["Definition & Core Idea", "Key Properties", "..."]
`;
  const raw = await callGroq(systemPrompt, "Plan outline for: " + topic, 400, 0.3);
  const outline = safeParseJSON(raw, "notes-outline");
  if (!Array.isArray(outline) || outline.length < 3) {
    throw new Error("Outline generation failed - too few sections.");
  }
  return outline;
}

async function expandSection(topic, heading, mode, groundingContext, attempt = 1) {
  const systemPrompt = `
You are a study-notes writer expanding ONE section thoroughly and accurately.

${groundingBlock(mode, groundingContext)}

Topic: ${topic}
Section: "${heading}"

Rules:
- ${mode === "file" ? "Use ONLY the source text above. If this section is not covered in it, write Not covered in source instead of inventing content." : "Stay consistent with the verified facts above. Do not fabricate statistics, dates, or names."}
- At least 4 substantive key points - no vague filler.
- Include a "definitions" object for any jargon introduced (empty {} if none).
- Include one short worked example where applicable (empty string if not applicable).

Return ONLY this JSON:
{
  "heading": "${heading}",
  "keyPoints": ["...", "..."],
  "definitions": { "term": "definition" },
  "example": "..."
}
`;
  const raw = await callGroq(systemPrompt, "Expand section: " + heading, 1000, 0.3);
  const section = safeParseJSON(raw, "notes-section");

  if ((!Array.isArray(section.keyPoints) || section.keyPoints.length < 3) && attempt < 2) {
    console.warn("Section " + heading + " too shallow, retrying...");
    return expandSection(topic, heading, mode, groundingContext, attempt + 1);
  }
  return section;
}

async function generateTLDR(topic, sections) {
  const flatPoints = sections.flatMap((s) => s.keyPoints || []).join("\n- ");
  const systemPrompt = `
Summarize these study notes into a 3-line TL;DR. Be concise - do not add anything beyond what is listed.

Topic: ${topic}
Key points covered:
- ${flatPoints}

Return ONLY plain text, 3 short lines. No markdown.
`;
  const raw = await callGroq(systemPrompt, "Generate TL;DR", 150, 0.3);
  return raw.trim();
}

async function generateThoroughNotes({ topic, mode, groundingContext }) {
  const outline = await generateOutline(topic, mode, groundingContext);
  const sections = await Promise.all(
    outline.map((heading) => expandSection(topic, heading, mode, groundingContext))
  );
  const tldr = await generateTLDR(topic, sections);
  return { title: topic, sections, tldr };
}

router.post("/generate", upload.single("file"), async (req, res) => {
  try {
    const { subject, topic, mode } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: "Subject and topic are required." });
    }

    let groundingContext = "";
    let sourceType = "topic";

    if (mode === "file") {
      if (!req.file) return res.status(400).json({ error: "No file uploaded." });
      sourceType = req.file.mimetype === "application/pdf" ? "pdf" : "image";
      const sourceText = await extractSourceText(req.file);
      if (!sourceText || sourceText.trim().length < 20) {
        return res.status(400).json({ error: "Could not extract enough text from the file." });
      }
      groundingContext = sourceText.slice(0, 12000);
    } else {
      groundingContext = await fetchWebContext(topic);
    }

    const notes = await generateThoroughNotes({ topic, mode, groundingContext });
    res.json({ subject, topic, sourceType, mode, notes });
  } catch (err) {
    console.error("Notes generate error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate notes." });
  }
});

router.post("/save", async (req, res) => {
  const { userId, subject, topic, sourceType, notes, tags = [] } = req.body;
  if (!userId || !subject || !topic || !notes) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const note = new Note({
      userId, subject, topic, sourceType,
      sections: notes.sections,
      tldr: notes.tldr,
      tags,
    });
    await note.save();
    res.json({ success: true, noteId: note._id });
  } catch (err) {
    console.error("Notes save error:", err.message);
    res.status(500).json({ error: "Failed to save notes." });
  }
});

router.get("/single/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found." });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch note." });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .select("subject topic sourceType tldr tags createdAt");

    const grouped = notes.reduce((acc, n) => {
      acc[n.subject] = acc[n.subject] || [];
      acc[n.subject].push(n);
      return acc;
    }, {});

    res.json({ grouped, total: notes.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notes." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { sections, tldr, tags } = req.body;
    const updated = await Note.findByIdAndUpdate(
      req.params.id,
      { ...(sections && { sections }), ...(tldr && { tldr }), ...(tags && { tags }) },
      { new: true }
    );
    res.json({ note: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update note." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete note." });
  }
});

module.exports = router;
