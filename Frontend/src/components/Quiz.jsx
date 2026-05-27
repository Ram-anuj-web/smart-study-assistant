import { useState } from "react";
 import BASE_URL from "../config"; 

export default function Quiz({ data, topic = null, userId = null }) {
  const questions = data.questions;

  const [current, setCurrent]           = useState(0);
  const [selected, setSelected]         = useState(null);
  const [confirmed, setConfirmed]       = useState(false);
  const [score, setScore]               = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [finished, setFinished]         = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [saving, setSaving]             = useState(false);

  const q = questions[current];

  function handleSelect(key) {
    if (confirmed) return;
    setSelected(key);
  }

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
    if (selected === q.answer) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((w) => [...w, q.question]);
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setFinished(true);
     saveProgress(score);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
    }
  }

 async function saveProgress(finalScore) {
    if (!userId || !topic) return;
    const scorePercent = Math.round((finalScore / questions.length) * 100);
    console.log("Saving:", { userId, topic, scorePercent, wrongAnswers }); // ← add this
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/progress/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, topic, scorePercent, wrongAnswers }),
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
    if (scorePercent >= 90) return { label: "Excellent! 🎉", color: "#22c55e" };
    if (scorePercent >= 75) return { label: "Good job! 👍",  color: "#6366f1" };
    if (scorePercent >= 50) return { label: "Keep going 💪", color: "#f59e0b" };
    return { label: "Needs review 📚", color: "#ef4444" };
  }

  /* ─── styles ────────────────────────────────────────────────────────────── */
  const S = {
    wrap: {
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#0f0f13",
      borderRadius: 16,
      padding: "24px 28px",
      color: "#e2e2e8",
      maxWidth: 680,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    badge: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#a78bfa",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    title: {
      margin: "4px 0 16px",
      fontSize: 22,
      fontWeight: 700,
      color: "#c4c4d0",
    },
    scoreLive: {
      fontSize: 14,
      fontWeight: 600,
      color: "#a78bfa",
      background: "rgba(167,139,250,0.12)",
      padding: "4px 12px",
      borderRadius: 20,
    },
    progressBar: {
      height: 4,
      background: "#1e1e2a",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 20,
    },
    progressFill: (pct) => ({
      height: "100%",
      width: `${pct}%`,
      background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
      borderRadius: 4,
      transition: "width 0.4s ease",
    }),
    card: {
      background: "#16161f",
      borderRadius: 14,
      padding: "24px 20px",
      border: "1px solid #2a2a38",
    },
    questionText: {
      textAlign: "center",
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 22,
      lineHeight: 1.5,
      color: "#dddde8",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    },
    optionBtn: (state) => {
      const base = {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: 10,
        border: "2px solid",
        cursor: state === "confirmed-other" ? "default" : "pointer",
        fontSize: 14,
        fontWeight: 500,
        textAlign: "left",
        transition: "all 0.18s ease",
        outline: "none",
        width: "100%",
        // CRITICAL: ensure pointer-events work on button itself
        pointerEvents: state === "confirmed-other" ? "none" : "auto",
      };
      if (state === "correct")  return { ...base, background: "rgba(34,197,94,0.15)",  borderColor: "#22c55e", color: "#86efac" };
      if (state === "wrong")    return { ...base, background: "rgba(239,68,68,0.15)",   borderColor: "#ef4444", color: "#fca5a5" };
      if (state === "selected") return { ...base, background: "rgba(167,139,250,0.15)", borderColor: "#a78bfa", color: "#c4b5fd" };
      // default / unconfirmed-other
      return { ...base, background: "#1e1e2a", borderColor: "#2a2a38", color: "#b0b0c0" };
    },
    keyBadge: (state) => ({
      minWidth: 26,
      height: 26,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      background:
        state === "correct"  ? "#22c55e" :
        state === "wrong"    ? "#ef4444" :
        state === "selected" ? "#a78bfa" : "#2a2a38",
      color: state === "default" ? "#888" : "#fff",
      flexShrink: 0,
      // CRITICAL: spans must NOT intercept clicks
      pointerEvents: "none",
    }),
    optionLabel: {
      pointerEvents: "none", // prevent span from eating the click
      lineHeight: 1.35,
    },
    explanation: (correct) => ({
      marginTop: 16,
      padding: "14px 16px",
      borderRadius: 10,
      background: correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
      borderLeft: `4px solid ${correct ? "#22c55e" : "#ef4444"}`,
      fontSize: 14,
      lineHeight: 1.6,
      color: "#c8c8d8",
    }),
    explanationTitle: {
      fontWeight: 700,
      marginBottom: 4,
      color: (correct) => correct ? "#86efac" : "#fca5a5",
    },
    actions: {
      marginTop: 20,
      display: "flex",
      justifyContent: "flex-end",
    },
    btnPrimary: (disabled) => ({
      background: disabled ? "#2a2a38" : "linear-gradient(135deg,#7c3aed,#a78bfa)",
      color: disabled ? "#555" : "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 28px",
      fontSize: 15,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 0.2s",
      opacity: disabled ? 0.6 : 1,
    }),

    /* result screen */
    resultCard: {
      background: "#16161f",
      borderRadius: 14,
      padding: "36px 24px",
      border: "1px solid #2a2a38",
      textAlign: "center",
    },
    resultScore: (color) => ({
      fontSize: 52,
      fontWeight: 800,
      color,
      lineHeight: 1,
    }),
    resultPct: (color) => ({
      fontSize: 28,
      fontWeight: 700,
      color,
      marginTop: 4,
    }),
    resultLabel: {
      fontSize: 18,
      marginTop: 10,
      marginBottom: 20,
      color: "#b0b0c0",
    },
    wrongList: {
      textAlign: "left",
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 20,
    },
    wrongTitle: {
      fontWeight: 700,
      color: "#fca5a5",
      marginBottom: 8,
      fontSize: 14,
    },
    wrongItem: {
      fontSize: 13,
      color: "#c4c4d0",
      lineHeight: 1.8,
    },
    saveStatus: {
      marginBottom: 16,
      fontSize: 13,
      color: "#a0a0b0",
    },
  };

  /* ─── helpers ───────────────────────────────────────────────────────────── */
  function getOptionState(key) {
    if (!confirmed) return key === selected ? "selected" : "default";
    if (key === q.answer)      return "correct";
    if (key === selected)      return "wrong";
    return "confirmed-other";
  }

  /* ─── Finished screen ───────────────────────────────────────────────────── */
  if (finished) {
    const grade = getGrade();
    return (
      <div style={S.wrap}>
        <div style={S.header}>
          <span style={S.badge}>🧠 Quiz Complete</span>
        </div>
        <div style={S.resultCard}>
          <div style={S.resultScore(grade.color)}>
            {score} / {questions.length}
          </div>
          <div style={S.resultPct(grade.color)}>{scorePercent}%</div>
          <div style={S.resultLabel}>{grade.label}</div>

          {userId && topic && (
            <div style={S.saveStatus}>
              {saving   && "⏳ Saving progress…"}
              {submitted && !saving && "✅ Progress saved!"}
            </div>
          )}

          {wrongAnswers.length > 0 && (
            <div style={S.wrongList}>
              <div style={S.wrongTitle}>Review these questions:</div>
              {wrongAnswers.map((w, i) => (
                <div key={i} style={S.wrongItem}>• {w}</div>
              ))}
            </div>
          )}

          <button style={S.btnPrimary(false)} onClick={handleRestart}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ─── Question screen ───────────────────────────────────────────────────── */
  const isCorrect = confirmed && selected === q.answer;

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <span style={S.badge}>🧠 Quiz</span>
          <h2 style={S.title}>
            Question {current + 1} of {questions.length}
          </h2>
        </div>
        <span style={S.scoreLive}>Score: {score}</span>
      </div>

      {/* Progress bar */}
      <div style={S.progressBar}>
        <div style={S.progressFill((current / questions.length) * 100)} />
      </div>

      <div style={S.card}>
        <p style={S.questionText}>{q.question}</p>

        <div style={S.grid}>
          {Object.entries(q.options).map(([key, val]) => {
            const state = getOptionState(key);
            return (
              <button
                key={key}
                style={S.optionBtn(state)}
                onClick={() => handleSelect(key)}
                // belt-and-suspenders: also handle onMouseDown
                onMouseDown={(e) => e.preventDefault()}
              >
                <span style={S.keyBadge(state)}>{key}</span>
                <span style={S.optionLabel}>{val}</span>
              </button>
            );
          })}
        </div>

        {confirmed && (
          <div style={S.explanation(isCorrect)}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: isCorrect ? "#86efac" : "#fca5a5" }}>
              {isCorrect ? "✅ Correct!" : `❌ Correct answer: ${q.answer}`}
            </div>
            <div>{q.explanation}</div>
          </div>
        )}
      </div>

      <div style={S.actions}>
        {!confirmed ? (
          <button
            style={S.btnPrimary(!selected)}
            onClick={handleConfirm}
            disabled={!selected}
          >
            Confirm
          </button>
        ) : (
          <button style={S.btnPrimary(false)} onClick={handleNext}>
            {current + 1 >= questions.length ? "See Results" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}