import { useState } from "react";

export default function Quiz({ data }) {
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState({});

  const questions = data.questions;
  const score = submitted
    ? questions.filter((q, i) => selected[i] === q.answer).length
    : 0;

  function handleSelect(qIndex, option) {
    if (submitted) return;
    setSelected((s) => ({ ...s, [qIndex]: option }));
  }

  function handleSubmit() {
    if (Object.keys(selected).length < questions.length) return;
    setSubmitted(true);
  }

  function handleReset() {
    setSelected({});
    setSubmitted(false);
    setRevealed({});
  }

  function toggleExplanation(i) {
    setRevealed((r) => ({ ...r, [i]: !r[i] }));
  }

  const allAnswered = Object.keys(selected).length === questions.length;

  return (
    <div className="quiz-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">🧠 Quiz</span>
          <h2 className="output-title">
            {submitted ? `Score: ${score}/${questions.length}` : `${questions.length} Questions`}
          </h2>
        </div>
        {submitted && (
          <button className="icon-btn" onClick={handleReset}>Retake</button>
        )}
      </div>

      {/* Score bar */}
      {submitted && (
        <div className="score-bar-wrap">
          <div className="score-bar">
            <div
              className="score-fill"
              style={{ width: `${(score / questions.length) * 100}%` }}
            />
          </div>
          <span className="score-label">
            {score === questions.length
              ? "Perfect! 🎉"
              : score >= questions.length * 0.6
              ? "Good job! 👍"
              : "Keep studying! 📚"}
          </span>
        </div>
      )}

      {/* Questions */}
      <div className="questions-list">
        {questions.map((q, i) => {
          const userAnswer = selected[i];
          const isCorrect = userAnswer === q.answer;
          const status = !submitted
            ? "default"
            : isCorrect
            ? "correct"
            : "wrong";

          return (
            <div
              key={i}
              className={`question-card ${status}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="question-top">
                <span className="question-num">Q{i + 1}</span>
                <p className="question-text">{q.question}</p>
              </div>

              <div className="options-grid">
                {Object.entries(q.options).map(([key, val]) => {
                  let optClass = "option";
                  if (userAnswer === key) optClass += " selected";
                  if (submitted && key === q.answer) optClass += " correct-opt";
                  if (submitted && userAnswer === key && !isCorrect) optClass += " wrong-opt";

                  return (
                    <button
                      key={key}
                      className={optClass}
                      onClick={() => handleSelect(i, key)}
                      disabled={submitted}
                    >
                      <span className="opt-key">{key}</span>
                      <span className="opt-val">{val}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {submitted && (
                <div className="explanation-wrap">
                  <button
                    className="explain-btn"
                    onClick={() => toggleExplanation(i)}
                  >
                    {revealed[i] ? "Hide" : "Show"} Explanation
                  </button>
                  {revealed[i] && (
                    <p className="explanation-text">{q.explanation}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          className="generate-btn"
          onClick={handleSubmit}
          disabled={!allAnswered}
          style={{ marginTop: "1rem" }}
        >
          {allAnswered
            ? "Submit Quiz"
            : `Answer all questions (${Object.keys(selected).length}/${questions.length})`}
        </button>
      )}
    </div>
  );
}