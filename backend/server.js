require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "50kb" }));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait a moment." },
});
app.use("/api/", limiter);

// ─── Helper: call Groq ────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0].message.content;
}

// ─── Route: /api/summarize ────────────────────────────────────
app.post("/api/summarize", async (req, res) => {
  const { notes } = req.body;
  if (!notes || notes.trim().length < 20) {
    return res.status(400).json({ error: "Notes too short to summarize." });
  }

  const systemPrompt = `You are a study assistant. Summarize the student's notes into clear, concise bullet points.
Rules:
- Extract only the key concepts, definitions, and facts
- Use simple language a student can quickly review
- Format: return a JSON object like this:
  { "title": "Topic title inferred from notes", "bullets": ["point 1", "point 2", ...] }
- Return ONLY valid JSON. No extra text, no markdown, no backticks.`;

  try {
    const raw = await callGroq(systemPrompt, notes);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error("Summarize error:", err.message);
    res.status(500).json({ error: "Failed to generate summary. Try again." });
  }
});

// ─── Route: /api/flashcards ───────────────────────────────────
app.post("/api/flashcards", async (req, res) => {
  const { notes } = req.body;
  if (!notes || notes.trim().length < 20) {
    return res.status(400).json({ error: "Notes too short to generate flashcards." });
  }

  const systemPrompt = `You are a study assistant. Generate flashcards from the student's notes.
Rules:
- Each flashcard has a question on the front and a concise answer on the back
- Generate between 5 and 10 flashcards depending on note length
- Cover all major concepts
- Format: return a JSON object like this:
  { "cards": [ { "front": "Question?", "back": "Answer" }, ... ] }
- Return ONLY valid JSON. No extra text, no markdown, no backticks.`;

  try {
    const raw = await callGroq(systemPrompt, notes);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error("Flashcards error:", err.message);
    res.status(500).json({ error: "Failed to generate flashcards. Try again." });
  }
});

// ─── Route: /api/quiz ─────────────────────────────────────────
app.post("/api/quiz", async (req, res) => {
  const { notes } = req.body;
  if (!notes || notes.trim().length < 20) {
    return res.status(400).json({ error: "Notes too short to generate a quiz." });
  }

  const systemPrompt = `You are a study assistant. Generate a multiple-choice quiz from the student's notes.
Rules:
- Generate exactly 5 questions
- Each question has 4 options labeled A, B, C, D
- One correct answer per question
- Include a short explanation for the correct answer
- Format: return a JSON object like this:
  { "questions": [ { "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "answer": "A", "explanation": "..." }, ... ] }
- Return ONLY valid JSON. No extra text, no markdown, no backticks.`;

  try {
    const raw = await callGroq(systemPrompt, notes);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error("Quiz error:", err.message);
    res.status(500).json({ error: "Failed to generate quiz. Try again." });
  }
});
// ─── Route: /api/topic ────────────────────────────────────────
app.post("/api/topic", async (req, res) => {
  const { topic } = req.body;
  if (!topic || topic.trim().length < 3) {
    return res.status(400).json({ error: "Topic too short." });
  }

  const systemPrompt = `You are a study assistant. Given a topic, generate study material.
Rules:
- Write a clear educational paragraph (4-6 sentences) explaining the topic
- Summarize it in 4-6 bullet points
- Create exactly 5 multiple-choice quiz questions (A/B/C/D, one correct answer, short explanation)
- Create 6 flashcards (question front, answer back)
- Format: return ONLY a JSON object like this:
{
  "paragraph": "...",
  "summary": { "title": "...", "bullets": ["...", ...] },
  "quiz": { "questions": [ { "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "answer": "A", "explanation": "..." }, ... ] },
  "flashcards": { "cards": [ { "front": "...", "back": "..." }, ... ] }
}
- Return ONLY valid JSON. No extra text, no markdown, no backticks.`;

  try {
    const raw = await callGroq(systemPrompt, `Topic: ${topic}`);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error("Topic error:", err.message);
    res.status(500).json({ error: "Failed to generate topic content. Try again." });
  }
});

// ─── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "Smart Study API running ✅" }));

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));