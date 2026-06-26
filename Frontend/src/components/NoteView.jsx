// src/components/NoteView.jsx

import React from "react";

const NoteView = ({ notes, sourceType }) => {
  if (!notes) return null;

  return (
    <div className="note-view">
      <div className="note-view-header">
        <h3 className="note-view-title">{notes.title}</h3>
        {sourceType && (
          <span className={`source-badge source-${sourceType}`}>
            {sourceType === "pdf" ? "📄 PDF" : sourceType === "image" ? "🖼️ Image" : "🌐 Topic"}
          </span>
        )}
      </div>

      {notes.sections?.map((section, i) => (
        <div className="note-section" key={i}>
          <h4 className="note-section-heading">{section.heading}</h4>

          {section.keyPoints?.length > 0 && (
            <ul className="note-keypoints">
              {section.keyPoints.map((point, j) => (
                <li key={j}>{point}</li>
              ))}
            </ul>
          )}

          {section.definitions && Object.keys(section.definitions).length > 0 && (
            <div className="note-definitions">
              {Object.entries(section.definitions).map(([term, def], k) => (
                <div className="definition-row" key={k}>
                  <span className="definition-term">{term}</span>
                  <span className="definition-text">{def}</span>
                </div>
              ))}
            </div>
          )}

          {section.example && (
            <div className="note-example">
              <span className="note-example-label">Example</span>
              <p>{section.example}</p>
            </div>
          )}
        </div>
      ))}

      {notes.tldr && (
        <div className="note-tldr">
          <span className="note-tldr-label">TL;DR</span>
          <p>{notes.tldr}</p>
        </div>
      )}
    </div>
  );
};

export default NoteView;