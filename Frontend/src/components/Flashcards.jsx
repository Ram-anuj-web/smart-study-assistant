import { useState } from "react";

export default function Flashcards({ data }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState([]);

  const cards = data.cards;
  const current = cards[index];
  const isMastered = mastered.includes(index);

  function next() {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i + 1) % cards.length), 150);
  }

  function prev() {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i - 1 + cards.length) % cards.length), 150);
  }

  function toggleMastered() {
    setMastered((m) =>
      m.includes(index) ? m.filter((i) => i !== index) : [...m, index]
    );
  }

  function reset() {
    setIndex(0);
    setFlipped(false);
    setMastered([]);
  }

  return (
    <div className="flashcards-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">🃏 Flashcards</span>
          <h2 className="output-title">{cards.length} Cards</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="mastered-count">{mastered.length}/{cards.length} mastered</span>
          <button className="icon-btn" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="progress-dots">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`dot ${i === index ? "active" : ""} ${mastered.includes(i) ? "mastered" : ""}`}
            onClick={() => { setIndex(i); setFlipped(false); }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className={`card-scene`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={`card-inner ${flipped ? "flipped" : ""}`}>
          {/* Front */}
          <div className="card-face card-front">
            <span className="card-label">Question</span>
            <p className="card-text">{current.front}</p>
            <span className="card-hint">tap to reveal answer</span>
          </div>
          {/* Back */}
          <div className="card-face card-back">
            <span className="card-label">Answer</span>
            <p className="card-text">{current.back}</p>
            <span className="card-hint">tap to flip back</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card-controls">
        <button className="nav-btn" onClick={prev}>← Prev</button>
        <button
          className={`mastered-btn ${isMastered ? "is-mastered" : ""}`}
          onClick={toggleMastered}
        >
          {isMastered ? "✓ Mastered" : "Mark Mastered"}
        </button>
        <button className="nav-btn" onClick={next}>Next →</button>
      </div>

      <div className="card-counter">
        {index + 1} / {cards.length}
      </div>
    </div>
  );
}