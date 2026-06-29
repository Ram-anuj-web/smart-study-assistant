const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
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

// subject is now REQUIRED context for every web search — "deadlock" alone resolves
// to whatever's trending (a video game); "dbms deadlock" resolves to the right concept.
async function fetchWebContext(subject, topic) {
  const query = `${subject} ${topic}`.trim();
  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query, num: 8 },
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

// ─────────────────────────────────────────────
// Source extraction — image preprocessing + weak-OCR detection
// ─────────────────────────────────────────────
async function extractSourceText(file) {
  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(file.buffer);
    return { text: data.text || "", ocrWeak: (data.text || "").trim().length < 20 };
  }

  if (file.mimetype.startsWith("image/")) {
    const processed = await sharp(file.buffer)
      .resize({ width: 2000, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(150)
      .toBuffer();

    const result = await Tesseract.recognize(processed, "eng", {
      tessedit_pageseg_mode: 6,
    });

    const text = (result.data.text || "").trim();
    const alnumRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / Math.max(text.length, 1);
    const ocrWeak = text.length < 40 || alnumRatio < 0.5 || result.data.confidence < 40;

    return { text, ocrWeak, confidence: result.data.confidence };
  }

  throw new Error("Unsupported file type.");
}

function groundingBlock(mode, groundingContext) {
  if (!groundingContext) return "";
  return mode === "file"
    ? "SOURCE MATERIAL (document text + supplementary web research) - ground your notes in this:\n" + groundingContext
    : "VERIFIED WEB FACTS - ground your content in these, do not contradict or invent beyond them:\n" + groundingContext;
}

// Every prompt below now states the subject explicitly, up front, before the topic.
// This is what stops "deadlock" from being interpreted as the video game when
// subject is "dbms" — the model is told the domain, not left to infer it.
function subjectLine(subject, topic) {
  return `Subject area: ${subject}\nTopic: ${topic}\n(Interpret the topic strictly within this subject area — do not interpret it as anything else, even if that other meaning is more commonly known.)`;
}

async function generateOutline(subject, topic, mode, groundingContext) {
  const systemPrompt = mode === "file"
    ? `
You are planning thorough study notes, using a combination of document text and web research as source material.

${subjectLine(subject, topic)}

${groundingBlock(mode, groundingContext)}

Plan sections that fully and properly cover this topic, within the stated subject area. Use the document material as the primary basis, and the web research to fill in anything the document doesn't cover, so the notes end up complete - not limited to only what fragments survived in the document.

Return ONLY a JSON array of 4-8 section heading strings. No padding, but don't under-cover the topic just because the document text alone is thin.
`
    : `
You are an expert study-notes planner.

${subjectLine(subject, topic)}

${groundingBlock(mode, groundingContext)}

Return ONLY a JSON array of 5-8 section heading strings covering the topic's real breadth within the stated subject area - no filler, no padding.
Example: ["Definition & Core Idea", "Key Properties", "..."]
`;

  const raw = await callGroq(systemPrompt, "Plan outline for: " + subject + " - " + topic, 400, 0.3);
  const outline = safeParseJSON(raw, "notes-outline");
  if (!Array.isArray(outline) || outline.length < 1) {
    throw new Error("Outline generation failed - no sections found.");
  }
  return outline;
}

async function expandSection(subject, topic, heading, mode, groundingContext, attempt = 1) {
  const systemPrompt = `
You are a study-notes writer expanding ONE section. Write in clean, confident textbook/notes style - like a knowledgeable teacher, not a fact-checker.

${subjectLine(subject, topic)}

${groundingBlock(mode, groundingContext)}

Section: "${heading}"

Rules:
- Interpret "${topic}" strictly as it relates to ${subject}. If web facts above describe an unrelated meaning of this term (e.g. a different industry, product, or game with the same name), IGNORE those facts entirely and rely on your own knowledge of ${subject} instead.
- NEVER mention "the source", "the document", "the web", "OCR", or whether something was "covered" or "not covered". No meta-commentary about where information came from, anywhere in the output.
- ${mode === "file"
      ? "Use the document text and web research together as one blended source, filtered through the subject area above. Prefer the document where it has relevant detail, and use the web research to fill any gaps so every section is fully and accurately explained. If genuinely nothing is available on this exact sub-point from either source, briefly cover it using accurate general knowledge of the subject instead of leaving a gap."
      : "Stay consistent with the verified facts above where they actually match the subject area. Do not fabricate statistics, dates, or names."}
- At least 4 substantive key points - no vague filler, no hedging language.
- Include a "definitions" object for any jargon introduced (empty {} if none).
- Include one short worked example where applicable (empty string if not applicable).
- Your ENTIRE response must be valid JSON only - no explanations, no plain sentences, nothing outside the JSON object.

Return ONLY this JSON:
{
  "heading": "${heading}",
  "keyPoints": ["...", "..."],
  "definitions": { "term": "definition" },
  "example": "..."
}
`;
  const raw = await callGroq(systemPrompt, "Expand section: " + heading, 1000, 0.3);

  let section;
  try {
    section = safeParseJSON(raw, "notes-section");
  } catch (err) {
    if (attempt < 2) {
      console.warn(`Section "${heading}" returned invalid JSON, retrying...`);
      return expandSection(subject, topic, heading, mode, groundingContext, attempt + 1);
    }
    console.warn(`Section "${heading}" failed twice, using fallback.`);
    return {
      heading,
      keyPoints: [`Key concepts of ${heading} - regenerate this section for full detail.`],
      definitions: {},
      example: "",
    };
  }

  if ((!Array.isArray(section.keyPoints) || section.keyPoints.length < 3) && attempt < 2) {
    console.warn(`Section "${heading}" too shallow, retrying...`);
    return expandSection(subject, topic, heading, mode, groundingContext, attempt + 1);
  }
  return section;
}

async function generateTLDR(subject, topic, sections) {
  const flatPoints = sections.flatMap((s) => s.keyPoints || []).join("\n- ");
  const systemPrompt = `
Summarize these study notes into a 3-line TL;DR, in plain confident language. Do not mention sources, gaps, or what was or wasn't covered - just summarize the content as if it's settled, well-known material.

${subjectLine(subject, topic)}

Key points covered:
- ${flatPoints}

Return ONLY plain text, 3 short lines. No markdown.
`;
  const raw = await callGroq(systemPrompt, "Generate TL;DR", 150, 0.3);
  return raw.trim();
}

async function generateThoroughNotes({ subject, topic, mode, groundingContext }) {
  const outline = await generateOutline(subject, topic, mode, groundingContext);
  const sections = await Promise.all(
    outline.map((heading) => expandSection(subject, topic, heading, mode, groundingContext))
  );
  const tldr = await generateTLDR(subject, topic, sections);
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

      const { text: sourceText, ocrWeak } = await extractSourceText(req.file);

      const webContext = await fetchWebContext(subject, topic);

      if ((!sourceText || sourceText.trim().length < 20) && !webContext) {
        return res.status(400).json({
          error: "Could not extract enough text from the file, and no web information was found for this topic. Try a clearer photo or a more specific topic.",
        });
      }

      const docPart = sourceText && sourceText.trim().length > 0
        ? "DOCUMENT TEXT (may be partial or imperfectly scanned):\n" + sourceText.slice(0, 8000)
        : "DOCUMENT TEXT: [none extracted]";

      const webPart = webContext
        ? "SUPPLEMENTARY WEB RESEARCH (use to fill any gaps in the document):\n" + webContext
        : "SUPPLEMENTARY WEB RESEARCH: [none found]";

      groundingContext = docPart + "\n\n" + webPart;

      if (ocrWeak) console.log(`Notes: weak OCR for "${topic}", relying more on web grounding`);
    } else {
      groundingContext = await fetchWebContext(subject, topic);
    }

    const notes = await generateThoroughNotes({ subject, topic, mode, groundingContext });
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