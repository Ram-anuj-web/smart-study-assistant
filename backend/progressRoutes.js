// progressRoutes.js
const { processQuizResult, getDueTopics, getNextDifficulty } = require("./adaptiveEngine");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ─── Schema ───────────────────────────────────────────────────────────────────

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    topic: { type: String, required: true },
    masteryScore: { type: Number, default: 0 },
    difficulty: { type: String, default: "easy" }, // "easy" | "medium" | "hard"
    easinessFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 1 }, // days until next revision
    repetitions: { type: Number, default: 0 },
    nextRevisionDate: { type: Date, default: Date.now },
    history: [
      {
        date: { type: Date, default: Date.now },
        score: Number,       // 0–100
        timeSpent: Number,   // seconds
        wrongAnswers: [String],
      },
    ],
  },
  { timestamps: true }
);

// Compound index — one record per user per topic
userProgressSchema.index({ userId: 1, topic: 1 }, { unique: true });

const UserProgress =
  mongoose.models.UserProgress ||
  mongoose.model("UserProgress", userProgressSchema);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/progress/update
 * Call this after every quiz session
 *
 * Body: { userId, topic, scorePercent, timeSpent?, wrongAnswers? }
 *
 * Returns: updated progress doc
 */
router.post("/update", async (req, res) => {
  try {
    const { userId, topic, scorePercent, timeSpent = 0, wrongAnswers = [] } = req.body;

    if (!userId || !topic || scorePercent === undefined) {
      return res.status(400).json({ error: "userId, topic, and scorePercent are required" });
    }

    if (scorePercent < 0 || scorePercent > 100) {
      return res.status(400).json({ error: "scorePercent must be between 0 and 100" });
    }

    // Fetch existing progress or null (first time on this topic)
    const existing = await UserProgress.findOne({ userId, topic });

    // Run adaptive engine
    const updates = processQuizResult(existing, {
      topic,
      scorePercent,
      timeSpent,
      wrongAnswers,
    });

    // Upsert — create if first time, update if exists
    const updated = await UserProgress.findOneAndUpdate(
      { userId, topic },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      progress: updated,
    });
  } catch (err) {
    console.error("Error updating progress:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/progress/:userId
 * Get all topic progress for a user
 *
 * Returns: array of progress docs, sorted by mastery ASC (weakest first)
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const progressList = await UserProgress.find({ userId }).sort({ masteryScore: 1 });

    return res.json({
      success: true,
      progress: progressList,
    });
  } catch (err) {
    console.error("Error fetching progress:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/progress/:userId/topic/:topic
 * Get progress for a specific topic
 */
router.get("/:userId/topic/:topic", async (req, res) => {
  try {
    const { userId, topic } = req.params;

    const progress = await UserProgress.findOne({ userId, topic });

    if (!progress) {
      return res.json({
        success: true,
        progress: null,
        message: "No progress found for this topic yet",
      });
    }

    return res.json({ success: true, progress });
  } catch (err) {
    console.error("Error fetching topic progress:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/progress/:userId/recommendations
 * Topics due for revision today, sorted weakest first
 *
 * Returns: array of due topics with difficulty to study at
 */
router.get("/:userId/recommendations", async (req, res) => {
  try {
    const { userId } = req.params;

    const allProgress = await UserProgress.find({ userId });

    const dueTopics = getDueTopics(allProgress);

    const recommendations = dueTopics.map((p) => ({
      topic: p.topic,
      masteryScore: p.masteryScore,
      difficulty: p.difficulty,
      nextRevisionDate: p.nextRevisionDate,
      overdueBy: p.nextRevisionDate
        ? Math.max(
            0,
            Math.floor(
              (new Date() - new Date(p.nextRevisionDate)) / (1000 * 60 * 60 * 24)
            )
          )
        : null,
    }));

    return res.json({
      success: true,
      dueCount: recommendations.length,
      recommendations,
    });
  } catch (err) {
    console.error("Error fetching recommendations:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/progress/:userId/difficulty/:topic
 * What difficulty should the next quiz be for this topic?
 *
 * Returns: { topic, difficulty, masteryScore }
 */
router.get("/:userId/difficulty/:topic", async (req, res) => {
  try {
    const { userId, topic } = req.params;

    const progress = await UserProgress.findOne({ userId, topic });

    const masteryScore = progress ? progress.masteryScore : 0;
    const difficulty = getNextDifficulty(masteryScore);

    return res.json({
      success: true,
      topic,
      difficulty,
      masteryScore,
    });
  } catch (err) {
    console.error("Error fetching difficulty:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/progress/:userId/reset/:topic
 * Reset progress for a specific topic (useful for testing or user request)
 */
router.delete("/:userId/reset/:topic", async (req, res) => {
  try {
    const { userId, topic } = req.params;

    await UserProgress.findOneAndDelete({ userId, topic });

    return res.json({ success: true, message: `Progress reset for topic: ${topic}` });
  } catch (err) {
    console.error("Error resetting progress:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
