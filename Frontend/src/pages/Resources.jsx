// src/pages/Resources.jsx

import React, { useState } from "react";
import { fetchResources } from "../api/resources";
import ResourceCard from "../components/ResourceCard";

const Resources = () => {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await fetchResources(topic);
      setData(result);
    } catch (err) {
      setError("Failed to fetch resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resources-page">
      <h2 className="resources-title">🔗 Relevant Resources</h2>
      <p className="resources-subtitle">
        Enter a topic to find verified study materials
      </p>

      {/* Search Bar */}
      <div className="resources-search">
        <input
          type="text"
          placeholder="e.g. Binary Search Trees, Photosynthesis..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="resources-input"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="resources-btn"
        >
          {loading ? "Searching..." : "Find Resources"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="resources-error">{error}</p>}

      {/* Keywords */}
      {data?.keywords && (
        <p className="resources-keywords">
          🔎 Searching for: <strong>{data.keywords}</strong>
        </p>
      )}

      {/* Wikipedia */}
      {data?.wikipedia && (
        <div className="resources-section">
          <h3>📖 Wikipedia</h3>
          <ResourceCard {...data.wikipedia} />
        </div>
      )}

      {/* Articles */}
      {data?.articles?.length > 0 && (
        <div className="resources-section">
          <h3>📄 Articles</h3>
          <div className="resources-grid">
            {data.articles.map((item, i) => (
              <ResourceCard key={i} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {data?.videos?.length > 0 && (
        <div className="resources-section">
          <h3>🎥 YouTube</h3>
          <div className="resources-grid">
            {data.videos.map((item, i) => (
              <ResourceCard key={i} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data &&
        !data.wikipedia &&
        data.articles?.length === 0 &&
        data.videos?.length === 0 && (
          <p className="resources-empty">
            No resources found. Try a different topic.
          </p>
        )}
    </div>
  );
};

export default Resources;