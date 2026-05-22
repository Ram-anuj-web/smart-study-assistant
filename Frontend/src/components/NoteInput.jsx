import { useState } from "react";

const MAX = 10000;

const API_URL = "https://smart-study-assistant-vjt5.onrender.com";

export default function NoteInput({
  onGenerate,
  loading,
  setLoading,
}) {

  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  async function handleSubmit() {

    // Require either notes OR PDF
    if (
      notes.trim().length < 20 &&
      !pdfFile
    ) {
      return;
    }

    setLoading(true);

    try {

      let res;

      // ─────────────────────────────
      // PDF Upload
      // ─────────────────────────────
      if (pdfFile) {

        const formData = new FormData();

        formData.append("pdf", pdfFile);

        res = await fetch(
          `${API_URL}/api/pdf-summary`,
          {
            method: "POST",
            body: formData,
          }
        );

      } else {

        // ─────────────────────────────
        // Normal Notes
        // ─────────────────────────────
        res = await fetch(
          `${API_URL}/api/notes-all`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notes }),
          }
        );
      }

      const data = await res.json();

      // Handle backend errors
      if (!res.ok) {
        alert(data.error || "Something went wrong.");
        return;
      }

      onGenerate(data);

      // Optional reset
      setNotes("");
      setPdfFile(null);

    } catch (err) {

      console.error("API error:", err);

      alert("Failed to connect to server.");

    } finally {

      setLoading(false);
    }
  }

  return (
    <div className="note-input-wrap">

      <label>Your Notes or PDF</label>

      <div className="textarea-wrap">

        {/* PDF Upload */}
        <input
          type="file"
          accept=".pdf"
          disabled={loading}
          onChange={(e) =>
            setPdfFile(e.target.files[0])
          }
        />

        {/* PDF File Name */}
        {pdfFile && (
          <p className="pdf-name">
            📄 {pdfFile.name}
          </p>
        )}

        {/* Textarea */}
        <textarea
          value={notes}
          onChange={(e) =>
            setNotes(
              e.target.value.slice(0, MAX)
            )
          }
          placeholder={`Paste your notes here...

E.g. lecture notes, textbook paragraphs, any study material.

Or upload a PDF above.`}
          disabled={loading}
        />

        {/* Character Counter */}
        <span
          className={`char-count ${
            notes.length > MAX * 0.9
              ? "warn"
              : ""
          }`}
        >
          {notes.length}/{MAX}
        </span>

      </div>

      {/* Generate Button */}
      <button
        className="generate-btn"
        onClick={handleSubmit}
        disabled={
          loading ||
          (
            notes.trim().length < 20 &&
            !pdfFile
          )
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