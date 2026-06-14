import { useEffect, useState } from 'react'
import BASE_URL from '../../config'

function formatTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function ExamResults({ result, userId, onRetake, onNewExam }) {
  const { questions, responses, score, totalCorrect, totalQuestions, topic, settings, timeTakenTotal } = result
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function saveResult() {
      try {
        await fetch(`${BASE_URL}/api/exam/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, topic, settings, questions, responses, score, totalCorrect, totalQuestions, timeTakenTotal }),
        })
        setSaved(true)
      } catch (e) {
        console.warn('Could not save exam result:', e.message)
      }
    }
    if (userId) saveResult()
  }, [])

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const gradeColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--accent3)' : 'var(--danger)'

  return (
    <div className="exam-results">
      {/* Score Card */}
      <div className="exam-score-card">
        <div className="exam-grade" style={{ color: gradeColor }}>{grade}</div>
        <div className="exam-score-big" style={{ color: gradeColor }}>{score}%</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {totalCorrect} / {totalQuestions} correct · {formatTime(timeTakenTotal)}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {topic} · {settings?.difficulty}
        </p>
        {saved && (
          <span style={{ fontSize: '0.72rem', color: 'var(--accent2)', fontFamily: 'JetBrains Mono, monospace', marginTop: '0.5rem', display: 'block' }}>
            ✅ Result saved
          </span>
        )}
      </div>

      {/* Score Bar */}
      <div className="score-bar-wrap">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${gradeColor}, var(--accent))` }} />
        </div>
        <div className="score-label">{score >= 75 ? '🎉 Great job!' : score >= 50 ? '📈 Keep practising' : '💪 Review and retry'}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="generate-btn" onClick={onRetake} style={{ padding: '0.65rem 1.5rem' }}>
          🔁 Retake Exam
        </button>
        <button className="nav-btn" onClick={onNewExam}>
          ✨ New Exam
        </button>
      </div>

      {/* Per-question breakdown */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: '1rem' }}>
          Question Breakdown
        </h3>
        <div className="questions-list">
          {questions.map((q, i) => {
            const resp = responses[i]
            const isCorrect = resp?.isCorrect
            const isExpanded = expanded === i
            return (
              <div key={i} className={`question-card ${isCorrect ? 'correct' : 'wrong'}`}>
                <div className="question-top" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : i)}>
                  <span className="question-num">Q{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div className="question-text">{q.question}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                        {isCorrect ? '✅ Correct' : resp?.selected ? `❌ You chose ${resp.selected}` : '⏭ Skipped'}
                      </span>
                      {!isCorrect && (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--success)' }}>
                          · Correct: {q.answer} — {q.options[q.answer]}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div className="explanation-wrap">
                    <div className="options-grid" style={{ marginBottom: '0.75rem' }}>
                      {Object.entries(q.options).map(([key, val]) => {
                        let cls = 'option'
                        if (key === q.answer) cls += ' correct-opt'
                        else if (key === resp?.selected) cls += ' wrong-opt'
                        return (
                          <div key={key} className={cls} style={{ cursor: 'default' }}>
                            <span className="opt-key">{key}</span>
                            <span className="opt-val">{val}</span>
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <p className="explanation-text">💬 {q.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}