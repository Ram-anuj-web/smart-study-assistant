import { useState } from "react";

const MAX = 3000;

const API_URL = "https://smart-study-assistant-vjt5.onrender.com";

export default function NoteInput({
  onGenerate,
  loading,
  setLoading,
}) {
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (notes.trim().length < 20) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/notes-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes }),
        }
      );

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
          onChange={(e) =>
            setNotes(e.target.value.slice(0, MAX))
          }
          placeholder="Paste your notes here...

E.g. lecture notes, textbook paragraphs, any study material."
          disabled={loading}
        />

        <span
          className={`char-count ${
            notes.length > MAX * 0.9 ? "warn" : ""
          }`}
        >
          {notes.length}/{MAX}
        </span>

      </div>

      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={
          loading || notes.trim().length < 20
        }
      >
        {loading ? (
          <>
            <div className="spinner" />
            Generating...
          </>
        ) : (
          <>✨ Generate All</>
        )}
      </button>

    </div>
  );
}