// src/components/ResourceCard.jsx

import React from "react";

const sourceIcon = {
  wikipedia: "📖",
  article: "🔍",
  youtube: "🎥",
};

const sourceLabel = {
  wikipedia: "Wikipedia",
  article: "Article",
  youtube: "YouTube",
};

const ResourceCard = ({
  title,
  url,
  snippet,
  summary,
  source,
  thumbnail,
}) => {
  const displayText = snippet || summary || "";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="resource-card"
    >
      <div className="resource-card-header">
        <span className="resource-source-badge">
          {sourceIcon[source] || "🔗"} {sourceLabel[source] || source}
        </span>
      </div>

      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="resource-thumbnail"
        />
      )}

      <h4 className="resource-card-title">{title}</h4>

      {displayText && (
        <p className="resource-card-snippet">
          {displayText.length > 120
            ? displayText.slice(0, 120) + "..."
            : displayText}
        </p>
      )}
    </a>
  );
};

export default ResourceCard;