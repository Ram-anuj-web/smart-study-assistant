const mongoose = require("mongoose");

const ExamResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  topic: { type: String, required: true },
  source: { type: String, enum: ["topic", "notes", "pdf"], default: "topic" },
  settings: {
    difficulty: String,
    questionCount: Number,
    timeLimit: Number, // in seconds
    questionTypes: [String],
  },
  questions: [
    {
      question: String,
      options: { A: String, B: String, C: String, D: String },
      answer: String,       // correct answer key
      explanation: String,
      hint: String,
    },
  ],
  responses: [
    {
      questionIndex: Number,
      selected: String,     // what user picked (A/B/C/D)
      isCorrect: Boolean,
      timeTaken: Number,    // seconds spent on this question
    },
  ],
  score: Number,            // percentage
  totalCorrect: Number,
  totalQuestions: Number,
  timeTakenTotal: Number,   // seconds
  completedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExamResult", ExamResultSchema);