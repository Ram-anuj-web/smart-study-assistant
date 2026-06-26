// src/pages/NotesGenerator.jsx

import React, { useState } from "react";
import { generateNotes, saveNote } from "../api/notes";
import NoteView from "../components/NoteView";
import NotesLibrary from "../components/NotesLibrary";

// ⚠️ Placeholder — wire this to whatever you use elsewhere to identify the current user
const userId = localStorage.getItem("userId") || "guest";

const NotesGenerator = () => {
  const [view, setView] = useState("generate"); // "generate" | "library"
  const [mode, setMode] = useState("topic"); // "topic" | "file"
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) {
      setError("Please fill in both subject and topic.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Please upload a PDF or image file.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setSaved(false);

    try {
      const result = await generateNotes({ subject, topic, mode, file });
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to generate notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await saveNote({
        userId,
        subject: data.subject,
        topic: data.topic,
        sourceType: data.sourceType,
        notes: data.notes,
      });
      setSaved(true);
    } catch (err) {
      setError("Failed to save notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
    setSaved(false);
    setFile(null);
  };

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h2 className="notes-title">📝 Notes Generator</h2>
        <p className="notes-subtitle">
          Generate thorough, grounded study notes from a topic or your own files
        </p>
      </div>

      <div className="notes-view-toggle">
        <button className={`view-btn ${view === "generate" ? "active" : ""}`} onClick={() => setView("generate")}>
          Generate
        </button>
        <button className={`view-btn ${view === "library" ? "active" : ""}`} onClick={() => setView("library")}>
          My Notes
        </button>
      </div>

      {view === "library" ? (
        <NotesLibrary userId={userId} />
      ) : (
        <>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === "topic" ? "mode-btn-active" : ""}`}
              onClick={() => setMode("topic")}
            >
              🌐 From Topic
            </button>
            <button
              className={`mode-btn ${mode === "file" ? "mode-btn-active" : ""}`}
              onClick={() => setMode("file")}
            >
              📎 From PDF / Image
            </button>
          </div>

          <div className="notes-form">
            <input
              type="text"
              placeholder="Subject (e.g. DBMS, Operating Systems)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="notes-input"
            />
            <input
              type="text"
              placeholder="Topic (e.g. Normalization, Deadlocks)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="notes-input"
            />

            {mode === "file" && (
              <label className="file-upload-label">
                {file ? `📎 ${file.name}` : "Click to upload PDF or image"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  hidden
                />
              </label>
            )}

            <button onClick={handleGenerate} disabled={loading} className="notes-btn">
              {loading ? (
                <>
                  <span className="spinner" /> Generating
                </>
              ) : (
                "Generate Notes"
              )}
            </button>
          </div>

          {error && <p className="notes-error">{error}</p>}

          {loading && (
            <div className="notes-section-skeleton">
              <div className="skeleton" style={{ width: "60%", height: 22, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "90%", height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "80%", height: 14 }} />
            </div>
          )}

          {data && (
            <>
              <NoteView notes={data.notes} sourceType={data.sourceType} />
              <div className="notes-save-row">
                {saved ? (
                  <span className="save-done">✅ Saved to your library</span>
                ) : (
                  <button onClick={handleSave} disabled={saving} className="notes-btn-secondary">
                    {saving ? "Saving..." : "💾 Save to Library"}
                  </button>
                )}
                <button onClick={handleReset} className="notes-btn-ghost">
                  Generate Another
                </button>
              </div>
            </>
          )}

          {!data && !loading && !error && (
            <div className="notes-empty">
              <div className="empty-icon">📚</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-h)" }}>
                Generate thorough notes
              </h3>
              <p>Pick a topic or upload a file above — notes are outlined, expanded section-by-section, and grounded in real facts.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotesGenerator;