import { useState } from "react";
const MAX = 3000;

const API_URL = "https://smart-study-assistant-vjt5.onrender.com";

const PLACEHOLDERS = {
  summary: "Paste your notes here...\n\nE.g. lecture notes, textbook paragraphs, any study material.",
  flashcards: "Paste your notes here...\n\nWe'll turn every key concept into a flashcard.",
  quiz: "Paste your notes here...\n\nWe'll generate a 5-question quiz to test your knowledge.",
};

const BTN_LABELS = {
  summary: "Generate Summary",
  flashcards: "Generate Flashcards",
  quiz: "Generate Quiz",
};

const ENDPOINTS = {
  summary: "summarize",
  flashcards: "flashcards",
  quiz: "quiz",
};

export default function NoteInput({ onGenerate, loading, setLoading, activeTab }) {
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (notes.trim().length < 20) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/${ENDPOINTS[activeTab]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      onGenerate(data);
    } catch (err) {
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="note-input-wrap">
      <label>Your Notes</label>
      <div className="textarea-wrap">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, MAX))}
          placeholder={PLACEHOLDERS[activeTab]}
          disabled={loading}
        />
        <span className={`char-count ${notes.length > MAX * 0.9 ? "warn" : ""}`}>
          {notes.length}/{MAX}
        </span>
      </div>
      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={loading || notes.trim().length < 20}
      >
        {loading ? (
          <><div className="spinner" /> Generating...</>
        ) : (
          <>{BTN_LABELS[activeTab]}</>
        )}
      </button>
    </div>
  );
}