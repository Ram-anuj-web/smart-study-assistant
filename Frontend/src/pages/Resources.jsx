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
      <div className="resources-header">
        <h2 className="resources-title">🔗 Relevant Resources</h2>
        <p className="resources-subtitle">
          Enter a topic to find verified study materials
        </p>
      </div>

      {/* Search Bar */}
      <div className="resources-search">
        <div className="resources-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="e.g. Binary Search Trees, Photosynthesis..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="resources-input"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="resources-btn"
        >
          {loading ? (
            <>
              <span className="spinner" /> Searching
            </>
          ) : (
            "Find Resources"
          )}
        </button>
      </div>

      {/* Error */}
      {error && <p className="resources-error">{error}</p>}

      {/* Keywords */}
      {data?.keywords && (
        <div className="resources-keywords">
          🔎 Searching for:
          {data.keywords.split(",").map((kw, i) => (
            <span className="keyword-chip" key={i}>{kw.trim()}</span>
          ))}
        </div>
      )}

      {/* ── Loading Skeletons ── */}
      {loading && (
        <>
          <div className="resources-section">
            <div className="resources-section-header">
              <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="skeleton" style={{ width: 100, height: 18 }} />
            </div>
            <div className="skeleton skeleton-wiki" />
          </div>

          <div className="resources-section">
            <div className="resources-section-header">
              <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="skeleton" style={{ width: 80, height: 18 }} />
            </div>
            <div className="skeleton-grid">
              {[1,2,3,4].map((i) => <div className="skeleton skeleton-card" key={i} />)}
            </div>
          </div>
        </>
      )}

     {/* Wikipedia */}
{data?.wikipedia && (
  <div className="resources-section">
    <div className="resources-section-header">
      <div className="section-icon wikipedia">📖</div>
      <h3>Wikipedia</h3>
    </div>

    <a
      href={data.wikipedia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="wiki-card"
    >
      {data.wikipedia.thumbnail ? (
        <img
          src={data.wikipedia.thumbnail}
          alt={data.wikipedia.title}
          className="wiki-card-thumb"
        />
      ) : (
        <div className="wiki-card-thumb-placeholder">📖</div>
      )}

      <div className="wiki-card-body">
        <div className="wiki-card-title">
          {data.wikipedia.title}
        </div>

        <p className="wiki-card-summary">
          {data.wikipedia.summary?.length > 220
            ? data.wikipedia.summary.slice(0, 220) + "..."
            : data.wikipedia.summary}
        </p>
      </div>
    </a>
  </div>
)}
{/* Articles */}
      {data?.articles?.length > 0 && (
        <div className="resources-section">
          <div className="resources-section-header">
            <div className="section-icon article">📄</div>
            <h3>Articles</h3>
          </div>
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
          <div className="resources-section-header">
            <div className="section-icon youtube">🎥</div>
            <h3>YouTube</h3>
          </div>
          <div className="resources-grid">
            {data.videos.map((item, i) => (
              <ResourceCard key={i} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* No results state */}
      {data &&
        !data.wikipedia &&
        data.articles?.length === 0 &&
        data.videos?.length === 0 && (
          <div className="resources-empty">
            <div className="empty-icon">🔍</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-h)" }}>
              No resources found
            </h3>
            <p>Try a different topic or check your spelling.</p>
          </div>
        )}

      {/* Initial empty state (before search) */}
      {!data && !loading && !error && (
        <div className="resources-empty">
          <div className="empty-icon">📚</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-h)" }}>
            Find study materials
          </h3>
          <p>Search for a topic above to discover articles, videos, and Wikipedia summaries.</p>
        </div>
      )}
    </div>
  );
};

export default Resources;