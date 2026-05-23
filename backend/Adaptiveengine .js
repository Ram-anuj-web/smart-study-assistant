// adaptiveEngine.js
// Core SM-2 spaced repetition + adaptive difficulty engine

/**
 * SM-2 Algorithm
 * Updates interval, easiness factor, and next revision date
 * based on how well the student performed (0–5 quality score)
 *
 * quality mapping from % score:
 *   < 40%  → 0 (blackout)
 *   40-54% → 1 (incorrect, but familiar)
 *   55-69% → 2 (incorrect, easy to recall)
 *   70-79% → 3 (correct, with difficulty)
 *   80-89% → 4 (correct, after hesitation)
 *   90%+   → 5 (perfect)
 */

function scoreToQuality(scorePercent) {
  if (scorePercent < 40) return 0;
  if (scorePercent < 55) return 1;
  if (scorePercent < 70) return 2;
  if (scorePercent < 80) return 3;
  if (scorePercent < 90) return 4;
  return 5;
}

/**
 * Run SM-2 update on a progress record
 * @param {Object} progress - existing userProgress doc
 * @param {number} scorePercent - 0 to 100
 * @returns {Object} updated fields to save
 */
function runSM2(progress, scorePercent) {
  const quality = scoreToQuality(scorePercent);

  let { easinessFactor = 2.5, interval = 1, repetitions = 0 } = progress;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset repetitions, review soon
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor (clamp to minimum 1.3)
  easinessFactor = Math.max(
    1.3,
    easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextRevisionDate = new Date();
  nextRevisionDate.setDate(nextRevisionDate.getDate() + interval);

  return { easinessFactor, interval, repetitions, nextRevisionDate };
}

/**
 * Calculate mastery score (0–100) for a topic
 * Weighted: recent sessions count more
 * @param {Array} history - array of { score, date }
 * @returns {number} masteryScore
 */
function calculateMastery(history) {
  if (!history || history.length === 0) return 0;

  // Take last 10 sessions max
  const recent = history.slice(-10);

  // Weighted average — later sessions have higher weight
  let weightedSum = 0;
  let totalWeight = 0;

  recent.forEach((session, index) => {
    const weight = index + 1; // 1, 2, 3... (most recent = highest)
    weightedSum += session.score * weight;
    totalWeight += weight;
  });

  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine next difficulty based on mastery score
 * @param {number} masteryScore - 0 to 100
 * @returns {string} "easy" | "medium" | "hard"
 */
function getNextDifficulty(masteryScore) {
  if (masteryScore < 50) return "easy";
  if (masteryScore < 75) return "medium";
  return "hard";
}

/**
 * Get topics due for revision today
 * @param {Array} progressList - array of userProgress docs
 * @returns {Array} sorted list of topics due today or overdue
 */
function getDueTopics(progressList) {
  const now = new Date();

  return progressList
    .filter((p) => {
      if (!p.nextRevisionDate) return true; // never studied = always due
      return new Date(p.nextRevisionDate) <= now;
    })
    .sort((a, b) => {
      // Sort by mastery ASC — weakest topics first
      return (a.masteryScore || 0) - (b.masteryScore || 0);
    });
}

/**
 * Full update after a quiz session
 * Call this after a student completes a quiz on a topic
 *
 * @param {Object} existingProgress - current userProgress doc (or null if first time)
 * @param {Object} sessionData - { topic, scorePercent, timeSpent, wrongAnswers }
 * @returns {Object} fields to upsert into userProgress
 */
function processQuizResult(existingProgress, sessionData) {
  const { topic, scorePercent, timeSpent = 0, wrongAnswers = [] } = sessionData;

  const base = existingProgress || {
    topic,
    masteryScore: 0,
    difficulty: "easy",
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
    history: [],
  };

  // Append to history
  const updatedHistory = [
    ...base.history,
    {
      date: new Date(),
      score: scorePercent,
      timeSpent,
      wrongAnswers,
    },
  ];

  // Recalculate mastery
  const masteryScore = calculateMastery(updatedHistory);

  // Run SM-2
  const sm2Updates = runSM2(base, scorePercent);

  // Get new difficulty
  const difficulty = getNextDifficulty(masteryScore);

  return {
    topic,
    masteryScore,
    difficulty,
    history: updatedHistory,
    ...sm2Updates,
  };
}

module.exports = {
  processQuizResult,
  getDueTopics,
  getNextDifficulty,
  calculateMastery,
  runSM2,
  scoreToQuality,
};