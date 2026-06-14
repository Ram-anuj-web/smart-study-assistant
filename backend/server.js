const progressRoutes = require("./progressRoutes");
require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error:", err));
const multer = require("multer");
const pdfParse = require("pdf-parse");
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const app = express();
app.set("trust proxy", 1);





// ─────────────────────────────────────────────
// Multer — PDF file type validation
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json({ limit: "10mb" }));
const resourceRoutes = require("./routes/resourceRoutes");
app.use("/api/resources", resourceRoutes);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please wait a moment." },
});

app.use("/api/", limiter);
app.use("/api/progress", progressRoutes);

// ─────────────────────────────────────────────
// Serper.dev — Fetch real web context
// ─────────────────────────────────────────────
async function fetchWebContext(topic) {
  try {
    const sportsKeywords = ["ipl", "cricket", "football", "nba", "match", "season", "standings", "score"];
    const isSports = sportsKeywords.some((k) => topic.toLowerCase().includes(k));
    const query = isSports ? `${topic} 2026` : topic;

    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query, num: 8 },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const results = response.data?.organic || [];
    const answerBox = response.data?.answerBox?.answer || response.data?.answerBox?.snippet || "";
    const knowledgeGraph = response.data?.knowledgeGraph?.description || "";

    if (results.length === 0 && !answerBox) return "";

    let context = "";
    if (answerBox) context += `DIRECT ANSWER: ${answerBox}\n`;
    if (knowledgeGraph) context += `KNOWLEDGE: ${knowledgeGraph}\n`;
    context += results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");

    return context;
  } catch (err) {
    console.warn("⚠️ Serper web search failed:", err.message);
    return "";
  }
}

// ─────────────────────────────────────────────
// Groq model fallback chain
// ─────────────────────────────────────────────
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",   // primary — best quality
  "llama-3.1-8b-instant",      // fallback 1 — separate quota, very fast
  "gemma2-9b-it",              // fallback 2 — another separate quota
];

async function callGroq(systemPrompt, userContent, maxTokens = 4000) {
  let lastError;

  for (const model of GROQ_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      if (model !== GROQ_MODELS[0]) {
        console.log(`⚠️ Used fallback model: ${model}`);
      }
      return response.choices[0].message.content;
    } catch (err) {
      const isRateLimit = err?.status === 429 ||
        err?.message?.includes("rate_limit") ||
        err?.message?.includes("Rate limit");

      if (isRateLimit) {
        console.warn(`Rate limit hit on ${model}, trying next...`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw new Error("All Groq models hit rate limits. Try again in a few hours.");
}

async function callGroqMessages(messagesArray, systemPrompt, maxTokens = 1000) {
  let lastError;

  for (const model of GROQ_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesArray,
        ],
      });
      if (model !== GROQ_MODELS[0]) console.log(`⚠️ Fallback model used: ${model}`);
      return response.choices[0].message.content;
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.includes("rate_limit");
      if (isRateLimit) { lastError = err; continue; }
      throw err;
    }
  }

  throw new Error("All Groq models rate limited.");
}

// ─────────────────────────────────────────────
// Safe JSON parse
// ─────────────────────────────────────────────
function validateQuiz(questions) {
  const errors = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.options || !q.answer) {
      errors.push(`Q${i + 1}: missing options or answer`);
      continue;
    }
    if (!q.options[q.answer]) {
      errors.push(`Q${i + 1}: answer key "${q.answer}" not found in options`);
    }
  }
  return errors;
}

function safeParseJSON(raw, label) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    throw new Error(`${label}: AI returned invalid JSON — ${err.message}`);
  }
}

async function generateValidatedQuiz(topic, webContext, settings, weakAreaContext = "") {
  const {
    difficulty = "Medium",
    questionCount = 10,
    questionTypes = ["MCQ"],
    hints = false,
    detailedExplanations = true,
  } = settings;

  const questionTypeInstructions = {
    "MCQ":               "Multiple choice with 4 options (A, B, C, D)",
    "True / False":      'True/False — options must be exactly {"A": "True", "B": "False"}',
    "Fill in the blank": "Fill-in-the-blank — question has ___, options are 4 possible answers",
    "Scenario based":    "Real-world scenario requiring applied knowledge",
  };

  const selectedTypes = questionTypes.map(t => questionTypeInstructions[t] || t).join("; ");
  const explanationInstruction = detailedExplanations
    ? "Write a 2-3 sentence explanation: why the answer is correct AND why the other options are wrong."
    : "Write a one-sentence explanation.";

  const quizPrompt = `
You are a quiz generator. Your ONLY job is to generate accurate quiz questions.

${webContext ? `USE ONLY THESE VERIFIED FACTS — do not invent anything:\n${webContext}\n` : ""}
${weakAreaContext}

Topic: ${topic}
Difficulty: ${difficulty}
Question types: ${selectedTypes}
Number of questions: exactly ${questionCount}

STRICT RULES — failure to follow = wrong output:
1. Each question has options A, B, C, D (except True/False which has only A and B).
2. The "answer" field must be the letter (A/B/C/D) of the CORRECT option.
3. Verify: does options[answer] contain the correct answer text? If not, fix it before outputting.
4. Spread correct answers across A, B, C, D — do NOT put all answers as A.
5. The explanation must describe why options[answer] is correct. It must NOT say a different letter is correct.
6. Base every fact on the verified facts above only. Do not hallucinate.
${hints ? '7. Add a "hint" field — a subtle clue, does not reveal the answer.' : ""}

Return ONLY a JSON array — no wrapper object, no markdown:

[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "answer": "B",
    "explanation": "B is correct because... A is wrong because... C is wrong because..."${hints ? ',\n    "hint": "..."' : ""}
  }
]
`;

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callGroq(quizPrompt, `Generate ${questionCount} questions about: ${topic}`, 4000);
      const clean = raw.replace(/```json|```/g, "").trim();

      let questions;
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions) {
        questions = parsed.questions;
      } else {
        throw new Error("Unexpected quiz format from AI");
      }

      const errors = validateQuiz(questions);

      if (errors.length === 0) {
        console.log(`✅ Quiz validated on attempt ${attempt}`);
        return questions;
      }

      console.warn(`⚠️ Quiz attempt ${attempt} failed validation:`, errors);

      if (attempt === MAX_RETRIES) {
        const validQuestions = questions.filter(q => q.options && q.answer && q.options[q.answer]);
        console.warn(`⚠️ Returning ${validQuestions.length}/${questions.length} valid questions after ${MAX_RETRIES} attempts`);
        return validQuestions;
      }

    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`Quiz attempt ${attempt} error: ${err.message}, retrying...`);
    }
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

CRITICAL QUIZ RULES:
- "answer" must be the letter (A/B/C/D) whose option text is actually correct
- Verify options[answer] is correct before outputting
- Explanation must describe why options[answer] is correct

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

    const data = await pdfParse(req.file.buffer);
    const pdfText = data.text;

    if (!pdfText || pdfText.trim().length < 20) {
      return res.status(400).json({ error: "PDF contains insufficient text." });
    }

    const systemPrompt = `
You are a study assistant.

CRITICAL QUIZ RULES:
- "answer" must be the letter (A/B/C/D) whose option text is actually correct
- Verify options[answer] is correct before outputting
- Explanation must describe why options[answer] is correct

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

    if (err.message === "Only PDF files are allowed.") {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: err.message || "Failed to process PDF." });
  }
});

// ─────────────────────────────────────────────
// Generate ALL from Topic (with customizer + web grounding)
// ─────────────────────────────────────────────
app.post("/api/topic", async (req, res) => {
  const { topic, settings = {}, userId } = req.body;

  if (!topic || topic.trim().length < 3) {
    return res.status(400).json({ error: "Topic too short." });
  }

  const {
    difficulty           = "Medium",
    questionCount        = 10,
    detailLevel          = "Standard",
    questionTypes        = ["MCQ"],
    hints                = false,
    timedMode            = false,
    detailedExplanations = true,
    focusWeakAreas       = false,
  } = settings;

  const webContext = await fetchWebContext(topic);
  console.log(`🔍 Web context for "${topic}":`, webContext ? "✅ Found" : "⚠️ Not found");

  let weakAreaContext = "";
  if (focusWeakAreas && userId) {
    try {
      const UserProgress = mongoose.models.UserProgress;
      if (UserProgress) {
        const record = await UserProgress.findOne({ userId, topic });
        const lastSession = record?.history?.[record.history.length - 1];
        if (lastSession?.wrongAnswers?.length) {
          weakAreaContext = `\nThe user previously struggled with these questions — prioritise similar ones:\n${lastSession.wrongAnswers.map((q) => `- ${q}`).join("\n")}\n`;
        }
      }
    } catch (e) {
      console.warn("Could not fetch weak areas:", e.message);
    }
  }

  const detailInstruction = {
    Brief:      "Keep the paragraph and bullet points concise — 2-3 sentences max each.",
    Standard:   "Use moderate detail — 4-6 sentences in the paragraph.",
    "In-depth": "Be thorough — 6-8 sentences in the paragraph, detailed bullet points, and comprehensive flashcards.",
  }[detailLevel] || "";

  // ✅ FIX: hintInstruction is now properly defined before use in systemPrompt
  const hintInstruction = hints
    ? "- Add a hint field to each quiz question — a subtle clue that does not reveal the answer."
    : "";

  const systemPrompt = `
You are a study assistant.

${webContext ? `IMPORTANT: Use ONLY the following verified real-world facts. Do NOT invent facts.\n\nVERIFIED FACTS:\n${webContext}\n` : ""}
${weakAreaContext}

Generate study material with these settings:
- Difficulty: ${difficulty} — ${difficulty === "Easy" ? "basic recall questions" : difficulty === "Hard" ? "questions requiring deep understanding and analysis" : difficulty === "Mixed" ? "mix of easy, medium, and hard questions" : "moderate understanding required"}
- Number of quiz questions: exactly ${questionCount}
- Detail level: ${detailInstruction}
${hintInstruction}

Given the topic, generate:
1. An educational paragraph
2. A summary
3. Flashcards

Return ONLY valid JSON:

{
  "paragraph": "...",
  "summary": {
    "title": "...",
    "bullets": ["...", "..."]
  },
  "flashcards": {
    "cards": [{ "front": "...", "back": "..." }]
  }
}

No markdown. Only JSON.
`;

  const maxTokens = Math.min(6000, 2000 + questionCount * 250);

  try {
    const [contentRaw, quizQuestions] = await Promise.all([
      callGroq(systemPrompt, `Topic: ${topic}`, maxTokens),
      generateValidatedQuiz(topic, webContext, settings, weakAreaContext),
    ]);

    const parsed = safeParseJSON(contentRaw, "topic");

    parsed.quiz = { questions: quizQuestions };
    parsed.settings = { timedMode, timePerQuestion: 30 };

    res.json(parsed);
  } catch (err) {
    console.error("Topic error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate topic content." });
  }
});

// ─────────────────────────────────────────────
// Chat with context (Notes / Topic)
// ─────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, context } = req.body;

  if (!context || context.trim().length < 10) {
    return res.status(400).json({ error: "No context provided." });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages." });
  }

  const lastUserMessage = messages.filter(m => m.role === "user").at(-1)?.content || "";
  const webContext = await fetchWebContext(lastUserMessage);

  const systemPrompt = `
You are a smart study assistant. The user is studying the following content:

---
${context.slice(0, 8000)}
---

${webContext ? `You also have access to the following real-time web facts. Use these to answer current or live questions accurately:\n\n${webContext}\n` : ""}

Answer questions using both the study content and real-time facts above.
Be concise, clear, and helpful.
If the user asks something completely unrelated to both, gently redirect them.
`;

  try {
    const reply = await callGroqMessages(messages, systemPrompt, 1000);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Chat failed." });
  }
});
// ─────────────────────────────────────────────
// Exam Simulator
// ─────────────────────────────────────────────
const ExamResult = require("./models/ExamResult");

app.post("/api/exam/generate", async (req, res) => {
  const { topic, notes, settings = {}, userId } = req.body;

  const source = notes ? "notes" : "topic";
  const inputText = notes || topic;

  if (!inputText || inputText.trim().length < 3) {
    return res.status(400).json({ error: "Topic or notes required." });
  }

  const {
    difficulty    = "Medium",
    questionCount = 10,
    timeLimit     = 600,   // seconds, default 10 min
    questionTypes = ["MCQ"],
    hints         = false,
  } = settings;

  try {
    const webContext = source === "topic" ? await fetchWebContext(inputText) : "";

    let weakAreaContext = "";
    if (userId) {
      try {
        const recent = await ExamResult.find({ userId, topic: inputText })
          .sort({ completedAt: -1 })
          .limit(3);

        const wrongQuestions = recent.flatMap((r) =>
          r.responses
            .filter((resp) => !resp.isCorrect)
            .map((resp) => r.questions[resp.questionIndex]?.question)
            .filter(Boolean)
        );

        if (wrongQuestions.length) {
          weakAreaContext = `\nUser previously got these wrong — prioritise similar questions:\n${wrongQuestions.slice(0, 5).map((q) => `- ${q}`).join("\n")}\n`;
        }
      } catch (e) {
        console.warn("Could not fetch exam history:", e.message);
      }
    }

    const questions = await generateValidatedQuiz(
      inputText,
      webContext,
      { difficulty, questionCount, questionTypes, hints, detailedExplanations: true },
      weakAreaContext
    );

    res.json({
      topic: inputText,
      source,
      settings: { difficulty, questionCount, timeLimit, questionTypes, hints },
      questions,
    });
  } catch (err) {
    console.error("Exam generate error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate exam." });
  }
});

app.post("/api/exam/save", async (req, res) => {
  const {
    userId, topic, source, settings,
    questions, responses, score,
    totalCorrect, totalQuestions, timeTakenTotal,
  } = req.body;

  if (!userId || !topic || !questions || !responses) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const result = new ExamResult({
      userId, topic, source, settings,
      questions, responses, score,
      totalCorrect, totalQuestions, timeTakenTotal,
    });
    await result.save();
    res.json({ success: true, resultId: result._id });
  } catch (err) {
    console.error("Exam save error:", err.message);
    res.status(500).json({ error: "Failed to save exam result." });
  }
});

app.get("/api/exam/history/:userId", async (req, res) => {
  try {
    const results = await ExamResult.find({ userId: req.params.userId })
      .sort({ completedAt: -1 })
      .limit(20)
      .select("topic score totalCorrect totalQuestions timeTakenTotal settings completedAt");
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exam history." });
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