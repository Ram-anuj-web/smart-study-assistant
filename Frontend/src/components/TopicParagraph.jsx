export default function TopicParagraph({ text }) {
  return (
    <div className="summary-wrap">
      <div className="output-header">
        <div>
          <span className="output-badge">📄 Paragraph</span>
          <h2 className="output-title">Topic Overview</h2>
        </div>
      </div>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '0 var(--radius) var(--radius) 0',
          padding: '1.4rem 1.6rem',
          fontSize: '0.95rem',
          lineHeight: '1.8',
          color: 'var(--text)',
          animation: 'fadeUp 0.4s ease',
        }}
      >
        {text}
      </div>
    </div>
  )
}