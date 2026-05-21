import { useState } from "react";

export default function Summary({ data }) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    const text = data.bullets.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="summary-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">📋 Summary</span>
          <h2 className="output-title">{data.title}</h2>
        </div>
        <button className="icon-btn" onClick={copyAll}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      <ul className="bullet-list">
        {data.bullets.map((b, i) => (
          <li key={i} className="bullet-item" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="bullet-dot" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="output-footer">
        {data.bullets.length} key points extracted
      </div>
    </div>
  );
}