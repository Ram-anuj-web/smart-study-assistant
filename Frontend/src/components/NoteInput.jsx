import { useState } from "react";

const MAX = 10000;
const API_URL = "https://smart-study-assistant-vjt5.onrender.com";

export default function NoteInput({ onGenerate, loading, setLoading }) {
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleSubmit() {
    if (notes.trim().length < 20 && !pdfFile) return;
    setLoading(true);
    try {
      let res;
      if (pdfFile) {
        const formData = new FormData();
        formData.append("pdf", pdfFile);
        res = await fetch(`${API_URL}/api/pdf-summary`, { method: "POST", body: formData });
      } else {
        res = await fetch(`${API_URL}/api/notes-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
      }
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Something went wrong."); return; }
      onGenerate(data,notes);
      setNotes("");
      setPdfFile(null);
    } catch (err) {
      console.error("API error:", err);
      alert("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  }

  return (
    <div className="note-input-wrap">                      {/* was: input-card */}

      <label>Your Notes or PDF</label>                     {/* was: input-card-label p tag */}

      {/* Upload zone — now uses file-row + file-btn from your CSS */}
      <div className="file-row">
        <label
          className={`file-btn ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          📎 {pdfFile ? pdfFile.name : "Choose PDF"}
          <input
            type="file"
            accept=".pdf"
            disabled={loading}
            style={{ display: "none" }}
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </label>

        {pdfFile && (
          <span
            className="file-name"
            style={{ cursor: "pointer", color: "var(--danger)" }}
            onClick={() => setPdfFile(null)}
          >
            ✕ Remove
          </span>
        )}
      </div>

      {/* Textarea — textarea-wrap is already in your CSS, remove note-textarea class */}
      <div className="textarea-wrap">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, MAX))}
          placeholder={`Paste your notes here...\n\nE.g. lecture notes, textbook paragraphs, any study material.\n\nOr upload a PDF above.`}
          disabled={loading}
        />
        <span className={`char-count ${notes.length > MAX * 0.9 ? "warn" : ""}`}>
          {notes.length}/{MAX}
        </span>
      </div>

      {/* Generate button — generate-btn already in your CSS, align-self: flex-end handles positioning */}
      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={loading || (notes.trim().length < 20 && !pdfFile)}
      >
        {loading ? <><div className="spinner" /> Generating...</> : <>✨ Generate All</>}
      </button>

    </div>
  );
}