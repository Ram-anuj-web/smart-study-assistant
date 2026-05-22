require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");

const app = express();

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

app.use(express.json({ limit: "50kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many requests. Please wait a moment.",
  },
});

app.use("/api/", limiter);

// ─────────────────────────────────────────────
// Helper Function
// ─────────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  return response.choices[0].message.content;
}

// ─────────────────────────────────────────────
// Generate ALL from Notes
// ─────────────────────────────────────────────
app.post("/api/notes-all", async (req, res) => {
  const { notes } = req.body;

  if (!notes || notes.trim().length < 20) {
    return res.status(400).json({
      error: "Notes too short.",
    });
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

    const clean = raw.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(clean);

    res.json(parsed);

  } catch (err) {
    console.error("Notes-all error:", err.message);

    res.status(500).json({
      error: "Failed to generate study materials.",
    });
  }
});

// ─────────────────────────────────────────────
// Generate ALL from Topic
// ─────────────────────────────────────────────
app.post("/api/topic", async (req, res) => {
  const { topic } = req.body;

  if (!topic || topic.trim().length < 3) {
    return res.status(400).json({
      error: "Topic too short.",
    });
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
    const raw = await callGroq(
      systemPrompt,
      `Topic: ${topic}`
    );

    const clean = raw.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(clean);

    res.json(parsed);

  } catch (err) {
    console.error("Topic error:", err.message);

    res.status(500).json({
      error: "Failed to generate topic content.",
    });
  }
});

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "Smart Study API running ✅",
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});