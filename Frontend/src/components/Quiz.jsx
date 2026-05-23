import { useState } from "react";
import BASE_URL from "../config";

export default function Quiz({ data, topic = null, userId = null }) {
  const questions = data.questions;

  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore]         = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [finished, setFinished]   = useState(false);
  const [submitted, setSubmitted] = useState(false); // progress saved?
  const [saving, setSaving]       = useState(false);

  const q = questions[current];

  function handleSelect(key) {
    if (confirmed) return;
    setSelected(key);
  }

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);

    const isCorrect = selected === q.answer;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((w) => [...w, q.question]);
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setFinished(true);
      // Auto-save progress after quiz
      saveProgress(score + (selected === q.answer ? 1 : 0));
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
    }
  }

  async function saveProgress(finalScore) {
    // Only save if we have userId and topic
    if (!userId || !topic) return;

    const scorePercent = Math.round((finalScore / questions.length) * 100);
    setSaving(true);

    try {
      await fetch(`${BASE_URL}/api/progress/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          topic,
          scorePercent,
          wrongAnswers,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleRestart() {
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setScore(0);
    setWrongAnswers([]);
    setFinished(false);
    setSubmitted(false);
  }

  const scorePercent = Math.round((score / questions.length) * 100);

  function getGrade() {
    if (scorePercent >= 90) return { label: "Excellent! 🎉", color: "var(--success, #22c55e)" };
    if (scorePercent >= 75) return { label: "Good job! 👍", color: "var(--accent, #6366f1)" };
    if (scorePercent >= 50) return { label: "Keep going 💪", color: "var(--warning, #f59e0b)" };
    return { label: "Needs review 📚", color: "var(--danger, #ef4444)" };
  }

  // ── Finished screen ──────────────────────────────────────────────────────
  if (finished) {
    const grade = getGrade();
    return (
      <div className="quiz-wrap">
        <div className="output-header">
          <span className="output-badge">🧠 Quiz Complete</span>
        </div>

        <div className="quiz-result-card">
          <div className="result-score" style={{ color: grade.color }}>
            {score} / {questions.length}
          </div>
          <div className="result-percent" style={{ color: grade.color }}>
            {scorePercent}%
          </div>
          <div className="result-label">{grade.label}</div>

          {/* Progress save status */}
          {userId && topic && (
            <div className="progress-save-status">
              {saving && <span className="save-saving">⏳ Saving progress…</span>}
              {submitted && !saving && (
                <span className="save-done">✅ Progress saved!</span>
              )}
              {!saving && !submitted && !userId && (
                <span className="save-hint">💡 Log in to track progress</span>
              )}
            </div>
          )}

          {wrongAnswers.length > 0 && (
            <div className="wrong-answers">
              <h4>Review these:</h4>
              <ul>
                {wrongAnswers.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn-primary" onClick={handleRestart}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Question screen ──────────────────────────────────────────────────────
  const isCorrect = confirmed && selected === q.answer;
  const isWrong   = confirmed && selected !== q.answer;

  return (
    <div className="quiz-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">🧠 Quiz</span>
          <h2 className="output-title">
            Question {current + 1} of {questions.length}
          </h2>
        </div>
        <span className="quiz-score-live">Score: {score}</span>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      <div className="question-card">
        <p className="question-text">{q.question}</p>

        <div className="options-grid">
          {Object.entries(q.options).map(([key, val]) => {
            let cls = "option-btn";
            if (confirmed) {
              if (key === q.answer)       cls += " correct";
              else if (key === selected)  cls += " wrong";
            } else if (key === selected) {
              cls += " selected";
            }

            return (
              <button
                key={key}
                className={cls}
                onClick={() => handleSelect(key)}
              >
                <span className="option-key">{key}</span>
                <span className="option-val">{val}</span>
              </button>
            );
          })}
        </div>

        {confirmed && (
          <div className={`explanation ${isCorrect ? "correct-msg" : "wrong-msg"}`}>
            <strong>{isCorrect ? "✅ Correct!" : `❌ Correct answer: ${q.answer}`}</strong>
            <p>{q.explanation}</p>
          </div>
        )}
      </div>

      <div className="quiz-actions">
        {!confirmed ? (
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!selected}
          >
            Confirm
          </button>
        ) : (
          <button className="btn-primary" onClick={handleNext}>
            {current + 1 >= questions.length ? "See Results" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}