// src/components/NotesLibrary.jsx

import React, { useEffect, useState } from "react";
import { fetchUserNotes, fetchNoteById, deleteNote } from "../api/notes";
import NoteView from "./NoteView";

const NotesLibrary = ({ userId }) => {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [openSubject, setOpenSubject] = useState(null);

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserNotes(userId);
      setGrouped(result.grouped || {});
    } catch (err) {
      setError("Failed to load your notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (id) => {
    try {
      const result = await fetchNoteById(id);
      setActiveNote(result.note);
    } catch (err) {
      setError("Failed to open note.");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      if (activeNote?._id === id) setActiveNote(null);
      loadNotes();
    } catch (err) {
      setError("Failed to delete note.");
    }
  };

  const subjects = Object.keys(grouped);

  if (loading) return <p className="notes-loading-text">Loading your notes...</p>;
  if (error) return <p className="notes-error">{error}</p>;

  if (subjects.length === 0) {
    return (
      <div className="notes-empty">
        <div className="empty-icon">🗂️</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-h)" }}>
          No saved notes yet
        </h3>
        <p>Generate your first set of notes to start building your library.</p>
      </div>
    );
  }

  return (
    <div className="notes-library">
      <div className="notes-library-list">
        {subjects.map((subject) => (
          <div className="subject-group" key={subject}>
            <button
              className="subject-header"
              onClick={() => setOpenSubject(openSubject === subject ? null : subject)}
            >
              <span>{subject}</span>
              <span className="subject-count">{grouped[subject].length}</span>
            </button>

            {openSubject === subject && (
              <div className="subject-notes">
                {grouped[subject].map((note) => (
                  <div
                    className={`note-list-item ${activeNote?._id === note._id ? "active" : ""}`}
                    key={note._id}
                    onClick={() => handleOpen(note._id)}
                  >
                    <div className="note-list-item-body">
                      <span className="note-list-topic">{note.topic}</span>
                      {note.tldr && <p className="note-list-tldr">{note.tldr}</p>}
                    </div>
                    <button
                      className="note-delete-btn"
                      onClick={(e) => handleDelete(note._id, e)}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeNote && (
        <div className="notes-library-viewer">
          <NoteView
            notes={{ title: activeNote.topic, sections: activeNote.sections, tldr: activeNote.tldr }}
            sourceType={activeNote.sourceType}
          />
        </div>
      )}
    </div>
  );
};

export default NotesLibrary;