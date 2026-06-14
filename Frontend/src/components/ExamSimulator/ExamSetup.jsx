import { useState } from 'react'
import BASE_URL from '../../config'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed']
const QUESTION_TYPES = ['MCQ', 'True / False', 'Fill in the blank']
const TIME_OPTIONS = [
  { label: '5 min',  value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '30 min', value: 1800 },
]

export default function ExamSetup({ userId, onExamReady }) {
  const [source, setSource]         = useState('topic')
  const [topic, setTopic]           = useState('')
  const [notes, setNotes]           = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimit, setTimeLimit]   = useState(600)
  const [questionTypes, setQuestionTypes] = useState(['MCQ'])
  const [hints, setHints]           = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  function toggleType(type) {
    setQuestionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  async function handleGenerate() {
    if (source === 'topic' && !topic.trim()) return setError('Please enter a topic.')
    if (source === 'notes' && !notes.trim()) return setError('Please paste your notes.')
    if (questionTypes.length === 0) return setError('Select at least one question type.')

    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/exam/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic:  source === 'topic' ? topic : undefined,
          notes:  source === 'notes' ? notes : undefined,
          userId,
          settings: { difficulty, questionCount, timeLimit, questionTypes, hints },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam.')
      onExamReady(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="exam-setup">
      <div className="exam-setup-header">
        <span className="output-badge">🎯 EXAM SIMULATOR</span>
        <h2 className="output-title">Configure Your Exam</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          AI generates a timed mock test tailored to your settings
        </p>
      </div>

      {/* Source Toggle */}
      <div className="exam-section">
        <label className="exam-label">SOURCE</label>
        <div className="exam-toggle-row">
          <button
            className={`exam-toggle-btn ${source === 'topic' ? 'active' : ''}`}
            onClick={() => setSource('topic')}
          >📚 By Topic</button>
          <button
            className={`exam-toggle-btn ${source === 'notes' ? 'active' : ''}`}
            onClick={() => setSource('notes')}
          >📝 From Notes</button>
        </div>
      </div>

      {/* Input */}
      <div className="exam-section">
        <label className="exam-label">{source === 'topic' ? 'TOPIC' : 'YOUR NOTES'}</label>
        {source === 'topic' ? (
          <input
            className="exam-input"
            placeholder="e.g. Photosynthesis, World War II, React Hooks..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        ) : (
          <textarea
            className="exam-textarea"
            placeholder="Paste your notes here..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={6}
          />
        )}
      </div>

      {/* Settings Row */}
      <div className="exam-settings-grid">
        {/* Difficulty */}
        <div className="exam-section">
          <label className="exam-label">DIFFICULTY</label>
          <div className="exam-chip-row">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                className={`exam-chip ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div className="exam-section">
          <label className="exam-label">QUESTIONS — <span style={{ color: 'var(--accent)' }}>{questionCount}</span></label>
          <input
            type="range" min={5} max={30} step={5}
            value={questionCount}
            onChange={e => setQuestionCount(Number(e.target.value))}
            className="exam-slider"
          />
          <div className="exam-slider-labels">
            <span>5</span><span>30</span>
          </div>
        </div>

        {/* Time Limit */}
        <div className="exam-section">
          <label className="exam-label">TIME LIMIT</label>
          <div className="exam-chip-row">
            {TIME_OPTIONS.map(t => (
              <button
                key={t.value}
                className={`exam-chip ${timeLimit === t.value ? 'active' : ''}`}
                onClick={() => setTimeLimit(t.value)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div className="exam-section">
          <label className="exam-label">QUESTION TYPES</label>
          <div className="exam-chip-row">
            {QUESTION_TYPES.map(t => (
              <button
                key={t}
                className={`exam-chip ${questionTypes.includes(t) ? 'active' : ''}`}
                onClick={() => toggleType(t)}
              >{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Hints Toggle */}
      <div className="exam-section">
        <label className="exam-toggle-label">
          <div className={`exam-switch ${hints ? 'on' : ''}`} onClick={() => setHints(h => !h)}>
            <div className="exam-switch-thumb" />
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
            Enable hints <span style={{ color: 'var(--text-muted)' }}>(subtle clues per question)</span>
          </span>
        </label>
      </div>

      {error && <div className="exam-error">{error}</div>}

      <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
        {loading ? <><div className="spinner" /> Generating Exam...</> : '🚀 Start Exam'}
      </button>
    </div>
  )
}