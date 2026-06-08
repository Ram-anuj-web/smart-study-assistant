// src/components/ResourceCard.jsx

import React from "react";

const sourceIcon = {
  wikipedia: "📖",
  duckduckgo: "🔍",
  youtube: "🎥",
};

const sourceLabel = {
  wikipedia: "Wikipedia",
  duckduckgo: "Article",
  youtube: "YouTube",
};

const ResourceCard = ({ title, url, snippet, source, thumbnail }) => {
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

      {snippet && (
        <p className="resource-card-snippet">
          {snippet.length > 120
            ? snippet.slice(0, 120) + "..."
            : snippet}
        </p>
      )}
    </a>
  );
};

export default ResourceCard;