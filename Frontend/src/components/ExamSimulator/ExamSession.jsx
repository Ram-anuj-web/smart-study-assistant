import { useState, useEffect, useCallback } from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ExamSession({ exam, onFinish }) {
  const { questions, settings, topic } = exam
  const [current, setCurrent]     = useState(0)
  const [responses, setResponses] = useState([])
  const [selected, setSelected]   = useState(null)
  const [timeLeft, setTimeLeft]   = useState(settings.timeLimit)
  const [questionStart, setQuestionStart] = useState(Date.now())
  const [submitted, setSubmitted] = useState(false)

  const finishExam = useCallback((forceResponses) => {
    const finalResponses = forceResponses || responses
    // fill unanswered
    const filled = questions.map((_, i) =>
      finalResponses.find(r => r.questionIndex === i) ||
      { questionIndex: i, selected: null, isCorrect: false, timeTaken: 0 }
    )
    const totalCorrect = filled.filter(r => r.isCorrect).length
    const score = Math.round((totalCorrect / questions.length) * 100)
    onFinish({ questions, responses: filled, score, totalCorrect, totalQuestions: questions.length, topic, settings })
  }, [responses, questions, topic, settings, onFinish])

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) { finishExam(); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, finishExam])

  function handleSelect(key) {
    if (submitted) return
    setSelected(key)
  }

  function handleNext() {
    if (!submitted) return

    const timeTaken = Math.round((Date.now() - questionStart) / 1000)
    const isCorrect = selected === questions[current].answer
    const newResponses = [
      ...responses,
      { questionIndex: current, selected, isCorrect, timeTaken }
    ]
    setResponses(newResponses)

    if (current + 1 >= questions.length) {
      finishExam(newResponses)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setSubmitted(false)
      setQuestionStart(Date.now())
    }
  }

  function handleSkip() {
    const newResponses = [
      ...responses,
      { questionIndex: current, selected: null, isCorrect: false, timeTaken: 0 }
    ]
    setResponses(newResponses)
    if (current + 1 >= questions.length) {
      finishExam(newResponses)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setSubmitted(false)
      setQuestionStart(Date.now())
    }
  }

  const q = questions[current]
  const progress = ((current) / questions.length) * 100
  const isLow = timeLeft < 60
  const optionKeys = Object.keys(q.options)

  return (
    <div className="exam-session">
      {/* Header */}
      <div className="exam-session-header">
        <div className="exam-progress-info">
          <span className="exam-label">QUESTION {current + 1} / {questions.length}</span>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={`exam-timer ${isLow ? 'low' : ''}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Topic pill */}
      <div style={{ marginBottom: '0.5rem' }}>
        <span className="keyword-chip">{topic}</span>
        <span className="keyword-chip" style={{ marginLeft: '0.4rem' }}>{settings.difficulty}</span>
      </div>

      {/* Question */}
      <div className="exam-question-card">
        <div className="question-num">Q{current + 1}</div>
        <div className="question-text" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
          {q.question}
        </div>

        {q.hint && !submitted && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
              💡 Show hint
            </summary>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{q.hint}</p>
          </details>
        )}
      </div>

      {/* Options */}
      <div className="options-grid" style={{ marginTop: '1rem' }}>
        {optionKeys.map(key => {
          let cls = 'option'
          if (submitted) {
            if (key === q.answer) cls += ' correct-opt'
            else if (key === selected && key !== q.answer) cls += ' wrong-opt'
          } else if (key === selected) {
            cls += ' selected'
          }
          return (
            <button key={key} className={cls} onClick={() => handleSelect(key)} disabled={submitted}>
              <span className="opt-key">{key}</span>
              <span className="opt-val">{q.options[key]}</span>
            </button>
          )
        })}
      </div>

      {/* Explanation after submit */}
      {submitted && q.explanation && (
        <div className="explanation-wrap" style={{ marginTop: '1rem' }}>
          <p className="explanation-text">💬 {q.explanation}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
        {!submitted ? (
          <>
            <button className="nav-btn" onClick={handleSkip}>Skip</button>
            <button
              className="generate-btn"
              onClick={() => setSubmitted(true)}
              disabled={!selected}
              style={{ padding: '0.65rem 1.5rem' }}
            >
              Submit Answer
            </button>
          </>
        ) : (
          <button className="generate-btn" onClick={handleNext} style={{ padding: '0.65rem 1.5rem' }}>
            {current + 1 >= questions.length ? '🏁 Finish Exam' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}