import './Progress.css' 
import { useState, useEffect } from "react";
import BASE_URL from "../config";


export default function Progress({ userId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [allProgress, setAllProgress]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [activeView, setActiveView]           = useState("overview"); // "overview" | "due"

  useEffect(() => {
    if (!userId) return;
    fetchAll();
  }, [userId]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [recRes, progRes] = await Promise.all([
        fetch(`${BASE_URL}/api/progress/${userId}/recommendations`),
        fetch(`${BASE_URL}/api/progress/${userId}`),
      ]);
      const recData  = await recRes.json();
      const progData = await progRes.json();

      if (recData.success)  setRecommendations(recData.recommendations || []);
      if (progData.success) setAllProgress(progData.progress || []);
    } catch (err) {
      setError("Failed to load progress. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetTopic(topic) {
    if (!window.confirm(`Reset progress for "${topic}"?`)) return;
    await fetch(`${BASE_URL}/api/progress/${userId}/reset/${encodeURIComponent(topic)}`, {
      method: "DELETE",
    });
    fetchAll();
  }

  function getMasteryColor(score) {
    if (score >= 80) return "var(--success, #22c55e)";
    if (score >= 55) return "var(--warning, #f59e0b)";
    return "var(--danger, #ef4444)";
  }

  function getMasteryLabel(score) {
    if (score >= 80) return "Strong";
    if (score >= 55) return "Developing";
    return "Needs Work";
  }

  function getDifficultyBadge(diff) {
    const map = {
      easy:   { color: "#22c55e", label: "Easy" },
      medium: { color: "#f59e0b", label: "Medium" },
      hard:   { color: "#ef4444", label: "Hard" },
    };
    return map[diff] || map.easy;
  }

  if (!userId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>No session found</h3>
        <p>Your progress will appear here after your first quiz.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <h3>Loading your progress…</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>{error}</h3>
        <button className="btn-primary" onClick={fetchAll}>Retry</button>
      </div>
    );
  }

  if (allProgress.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>No progress yet</h3>
        <p>Complete a quiz in Topic mode to start tracking your mastery.</p>
      </div>
    );
  }

  // ── Stats summary ────────────────────────────────────────────────────────
  const avgMastery = Math.round(
    allProgress.reduce((acc, p) => acc + p.masteryScore, 0) / allProgress.length
  );
  const strongTopics = allProgress.filter((p) => p.masteryScore >= 80).length;
  const weakTopics   = allProgress.filter((p) => p.masteryScore < 50).length;

  return (
    <div className="progress-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">📊 Progress</span>
          <h2 className="output-title">Your Learning Dashboard</h2>
        </div>
        <button className="icon-btn" onClick={fetchAll}>🔄 Refresh</button>
      </div>

      {/* ── Stats row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{allProgress.length}</div>
          <div className="stat-label">Topics Studied</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: getMasteryColor(avgMastery) }}>
            {avgMastery}%
          </div>
          <div className="stat-label">Avg Mastery</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#22c55e" }}>{strongTopics}</div>
          <div className="stat-label">Strong</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#ef4444" }}>{weakTopics}</div>
          <div className="stat-label">Need Review</div>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="tabs" style={{ marginTop: "1rem" }}>
        <button
          className={`tab-btn ${activeView === "overview" ? "active" : ""}`}
          onClick={() => setActiveView("overview")}
        >
          📚 All Topics
        </button>
        <button
          className={`tab-btn ${activeView === "due" ? "active" : ""}`}
          onClick={() => setActiveView("due")}
        >
          🔔 Due Today {recommendations.length > 0 && (
            <span className="due-badge">{recommendations.length}</span>
          )}
        </button>
      </div>

      {/* ── All Topics view ── */}
      {activeView === "overview" && (
        <div className="topics-list">
          {allProgress.map((p) => {
            const diff = getDifficultyBadge(p.difficulty);
            return (
              <div className="topic-row" key={p.topic}>
                <div className="topic-row-left">
                  <div className="topic-name">{p.topic}</div>
                  <div className="topic-meta">
                    <span
                      className="diff-badge"
                      style={{ background: diff.color + "22", color: diff.color }}
                    >
                      {diff.label}
                    </span>
                    <span className="topic-sessions">
                      {p.history?.length || 0} session{p.history?.length !== 1 ? "s" : ""}
                    </span>
                    <span className="topic-next">
                      Next: {p.nextRevisionDate
                        ? new Date(p.nextRevisionDate).toLocaleDateString()
                        : "Now"}
                    </span>
                  </div>
                </div>

                <div className="topic-row-right">
                  <div className="mastery-bar-wrap">
                    <div className="mastery-bar">
                      <div
                        className="mastery-fill"
                        style={{
                          width: `${p.masteryScore}%`,
                          background: getMasteryColor(p.masteryScore),
                        }}
                      />
                    </div>
                    <span
                      className="mastery-pct"
                      style={{ color: getMasteryColor(p.masteryScore) }}
                    >
                      {p.masteryScore}%
                    </span>
                  </div>
                  <span
                    className="mastery-label-tag"
                    style={{ color: getMasteryColor(p.masteryScore) }}
                  >
                    {getMasteryLabel(p.masteryScore)}
                  </span>
                  <button
                    className="reset-btn"
                    onClick={() => resetTopic(p.topic)}
                    title="Reset progress"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Due Today view ── */}
      {activeView === "due" && (
        <>
          {recommendations.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 0" }}>
              <div className="empty-icon">✅</div>
              <h3>You're all caught up!</h3>
              <p>No topics due for revision today.</p>
            </div>
          ) : (
            <div className="topics-list">
              {recommendations.map((r) => {
                const diff = getDifficultyBadge(r.difficulty);
                return (
                  <div className="topic-row due-row" key={r.topic}>
                    <div className="topic-row-left">
                      <div className="topic-name">{r.topic}</div>
                      <div className="topic-meta">
                        <span
                          className="diff-badge"
                          style={{ background: diff.color + "22", color: diff.color }}
                        >
                          Next: {diff.label}
                        </span>
                        {r.overdueBy > 0 && (
                          <span className="overdue-tag">
                            {r.overdueBy}d overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="topic-row-right">
                      <span
                        className="mastery-pct"
                        style={{ color: getMasteryColor(r.masteryScore) }}
                      >
                        {r.masteryScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}