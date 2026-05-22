require("dotenv").config();
const multer = require("multer");
const pdfParse = require("pdf-parse").default || require("pdf-parse");
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");

const app = express();

// ─────────────────────────────────────────────
// Multer — PDF file type validation
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."), false);
    }
  },
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "10mb" }));

// Rate limit — 100 requests per 15 mins
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please wait a moment.",
  },
});

app.use("/api/", limiter);

// ─────────────────────────────────────────────
// Helper: Call Groq + safe JSON parse
// ─────────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0].message.content;
}

function safeParseJSON(raw, label) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    throw new Error(`${label}: AI returned invalid JSON — ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// Generate ALL from Notes
// ─────────────────────────────────────────────
app.post("/api/notes-all", async (req, res) => {
  const { notes } = req.body;

  if (!notes || notes.trim().length < 20) {
    return res.status(400).json({ error: "Notes too short." });
  }

  const systemPrompt = `
You are a study assistant.

Generate:

1. Summary
2. Flashcards
3. Quiz

RULES:

- Summary must contain:
  {
    "title": "...",
    "bullets": ["...", "..."]
  }

- Flashcards must contain:
  {
    "cards": [
      {
        "front": "...",
        "back": "..."
      }
    ]
  }

- Quiz must contain:
  {
    "questions": [
      {
        "question": "...",
        "options": {
          "A": "...",
          "B": "...",
          "C": "...",
          "D": "..."
        },
        "answer": "A",
        "explanation": "..."
      }
    ]
  }

Return ONLY valid JSON in this format:

{
  "summary": {
    "title": "...",
    "bullets": []
  },
  "flashcards": {
    "cards": []
  },
  "quiz": {
    "questions": []
  }
}

No markdown.
No backticks.
Only JSON.
`;

  try {
    const raw = await callGroq(systemPrompt, notes);
    const parsed = safeParseJSON(raw, "notes-all");
    res.json(parsed);
  } catch (err) {
    console.error("Notes-all error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate study materials." });
  }
});

// ─────────────────────────────────────────────
// PDF Upload Route
// ─────────────────────────────────────────────
app.post("/api/pdf-summary", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded." });
    }

    // Extract text from PDF
    const data = await pdfParse(req.file.buffer);
    const pdfText = data.text;

    if (!pdfText || pdfText.trim().length < 20) {
      return res.status(400).json({ error: "PDF contains insufficient text." });
    }

    const systemPrompt = `
You are a study assistant.

Summarize the PDF into concise study notes.

Return ONLY valid JSON:

{
  "summary": {
    "title": "...",
    "bullets": ["...", "..."]
  },
  "flashcards": {
    "cards": [
      {
        "front": "...",
        "back": "..."
      }
    ]
  },
  "quiz": {
    "questions": [
      {
        "question": "...",
        "options": {
          "A": "...",
          "B": "...",
          "C": "...",
          "D": "..."
        },
        "answer": "A",
        "explanation": "..."
      }
    ]
  }
}

Only JSON.
`;

    const raw = await callGroq(systemPrompt, pdfText.slice(0, 12000));
    const parsed = safeParseJSON(raw, "pdf-summary");
    res.json(parsed);

  } catch (err) {
    console.error("PDF error:", err.message);

    // Multer file type rejection
    if (err.message === "Only PDF files are allowed.") {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: err.message || "Failed to process PDF." });
  }
});

// ─────────────────────────────────────────────
// Generate ALL from Topic
// ─────────────────────────────────────────────
app.post("/api/topic", async (req, res) => {
  const { topic } = req.body;

  if (!topic || topic.trim().length < 3) {
    return res.status(400).json({ error: "Topic too short." });
  }

  const systemPrompt = `
You are a study assistant.

Given a topic:

1. Write an educational paragraph
2. Create a summary
3. Create flashcards
4. Create a quiz

RULES:

- Paragraph: 4-6 clear sentences

- Summary:
{
  "title": "...",
  "bullets": ["...", "..."]
}

- Flashcards:
{
  "cards": [
    {
      "front": "...",
      "back": "..."
    }
  ]
}

- Quiz:
{
  "questions": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "answer": "A",
      "explanation": "..."
    }
  ]
}

Return ONLY JSON in this format:

{
  "paragraph": "...",
  "summary": {},
  "flashcards": {},
  "quiz": {}
}

No markdown.
Only JSON.
`;

  try {
    const raw = await callGroq(systemPrompt, `Topic: ${topic}`);
    const parsed = safeParseJSON(raw, "topic");
    res.json(parsed);
  } catch (err) {
    console.error("Topic error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate topic content." });
  }
});

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Smart Study API running ✅" });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
