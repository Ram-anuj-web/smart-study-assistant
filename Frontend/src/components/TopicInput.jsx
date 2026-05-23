import { useState } from 'react'

export default function TopicInput({ onGenerate, loading, setLoading }) {
  const [topic, setTopic] = useState('')

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('https://smart-study-assistant-vjt5.onrender.com/api/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onGenerate(data, topic.trim())   // ← pass topic name as 2nd arg
    } catch (err) {
      alert(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="note-input-wrap">
      <label>ENTER A TOPIC</label>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        placeholder="e.g. Photosynthesis, The French Revolution, Newton's Laws..."
        style={{
          width: '100%',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.85rem 1rem',
          color: 'var(--text)',
          fontFamily: 'Instrument Sans, sans-serif',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)'
          e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
      />
      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
      >
        {loading ? <span className="spinner" /> : '✦'}
        {loading ? 'Generating…' : 'Generate All'}
      </button>
    </div>
  )
}