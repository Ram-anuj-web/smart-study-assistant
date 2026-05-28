import { useState } from 'react'
import BASE_URL from '../config'

const DEFAULTS = {
  difficulty: 'Medium',
  questionCount: 10,
  detailLevel: 'Standard',
  questionTypes: ['MCQ'],
  hints: false,
  timedMode: false,
  detailedExplanations: true,
  focusWeakAreas: false,
}

export default function TopicInput({ onGenerate, loading, setLoading, userId = null }) {
  const [topic, setTopic]         = useState('')
  const [open, setOpen]           = useState(false)
  const [settings, setSettings]   = useState(DEFAULTS)

  function toggleChip(field, value) {
    setSettings((s) => ({ ...s, [field]: value }))
  }

  function toggleMulti(field, value) {
    setSettings((s) => {
      const arr = s[field]
      return {
        ...s,
        [field]: arr.includes(value)
          ? arr.length > 1 ? arr.filter((v) => v !== value) : arr // keep at least one
          : [...arr, value],
      }
    })
  }

  function toggleBool(field) {
    setSettings((s) => ({ ...s, [field]: !s[field] }))
  }

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          settings,
          userId,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onGenerate(data, topic.trim())
    } catch (err) {
      alert(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  /* ── styles ── */
  const S = {
    wrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },

    customizeBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'none',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      color: 'var(--text-muted, #a0a0b0)',
      fontSize: '0.82rem',
      padding: '6px 14px',
      cursor: 'pointer',
      alignSelf: 'flex-start',
      transition: 'border-color 0.2s, color 0.2s',
    },

    panel: {
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '1.1rem 1.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },

    sectionLabel: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted, #a0a0b0)',
      marginBottom: '8px',
    },

    chipGroup: { display: 'flex', flexWrap: 'wrap', gap: '8px' },

    chip: (active) => ({
      padding: '5px 14px',
      borderRadius: '20px',
      border: active ? '1px solid #a78bfa' : '1px solid var(--border)',
      background: active ? 'rgba(167,139,250,0.15)' : 'transparent',
      color: active ? '#c4b5fd' : 'var(--text-muted, #a0a0b0)',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }),

    sliderRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },

    sliderLabel: {
      fontSize: '13px',
      color: 'var(--text-muted, #a0a0b0)',
      minWidth: '90px',
    },

    sliderVal: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#a78bfa',
      minWidth: '28px',
    },

    toggleRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    },

    toggleRowLast: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
    },

    toggleLabel: { fontSize: '13px', color: 'var(--text, #e2e2e8)' },
    toggleDesc:  { fontSize: '11px', color: 'var(--text-muted, #a0a0b0)', marginTop: '2px' },

    toggle: (on) => ({
      width: '36px',
      height: '20px',
      borderRadius: '10px',
      background: on ? '#a78bfa' : 'var(--border)',
      position: 'relative',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.2s',
      border: 'none',
      outline: 'none',
    }),

    toggleThumb: (on) => ({
      position: 'absolute',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      background: '#fff',
      top: '3px',
      left: on ? '19px' : '3px',
      transition: 'left 0.2s',
    }),

    divider: {
      border: 'none',
      borderTop: '1px solid var(--border)',
      margin: '0',
    },

    summaryPills: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginTop: '2px',
    },

    pill: {
      fontSize: '11px',
      padding: '3px 10px',
      borderRadius: '20px',
      background: 'rgba(167,139,250,0.1)',
      color: '#a78bfa',
      border: '1px solid rgba(167,139,250,0.25)',
    },
  }

  const activePills = [
    settings.difficulty,
    `${settings.questionCount} Qs`,
    settings.detailLevel,
    ...settings.questionTypes,
    settings.hints && 'Hints',
    settings.timedMode && 'Timed',
    settings.focusWeakAreas && 'Weak areas',
  ].filter(Boolean)

  return (
    <div className="note-input-wrap" style={S.wrap}>
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

      {/* ── Customise toggle button ── */}
      <button style={S.customizeBtn} onClick={() => setOpen((o) => !o)}>
        <span style={{ fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
        {open ? 'Hide options' : 'Customise quiz'}
      </button>

      {/* ── Summary pills when closed ── */}
      {!open && (
        <div style={S.summaryPills}>
          {activePills.map((p) => (
            <span key={p} style={S.pill}>{p}</span>
          ))}
        </div>
      )}

      {/* ── Customiser panel ── */}
      {open && (
        <div style={S.panel}>

          {/* Difficulty */}
          <div>
            <div style={S.sectionLabel}>Difficulty</div>
            <div style={S.chipGroup}>
              {['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => (
                <button key={d} style={S.chip(settings.difficulty === d)}
                  onClick={() => toggleChip('difficulty', d)}>{d}</button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <div style={S.sectionLabel}>Number of questions</div>
            <div style={S.sliderRow}>
              <span style={S.sliderLabel}>Questions</span>
              <input
                type="range" min={5} max={30} step={5}
                value={settings.questionCount}
                onChange={(e) => setSettings((s) => ({ ...s, questionCount: Number(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={S.sliderVal}>{settings.questionCount}</span>
            </div>
          </div>

          {/* Detail level */}
          <div>
            <div style={S.sectionLabel}>Detail level</div>
            <div style={S.chipGroup}>
              {['Brief', 'Standard', 'In-depth'].map((d) => (
                <button key={d} style={S.chip(settings.detailLevel === d)}
                  onClick={() => toggleChip('detailLevel', d)}>{d}</button>
              ))}
            </div>
          </div>

          {/* Question types */}
          <div>
            <div style={S.sectionLabel}>Question types</div>
            <div style={S.chipGroup}>
              {['MCQ', 'True / False', 'Fill in the blank', 'Scenario based'].map((t) => (
                <button key={t} style={S.chip(settings.questionTypes.includes(t))}
                  onClick={() => toggleMulti('questionTypes', t)}>{t}</button>
              ))}
            </div>
          </div>

          <hr style={S.divider} />

          {/* Toggles */}
          {[
            { field: 'hints',                label: 'Show hints',             desc: 'Give a clue before revealing the answer' },
            { field: 'timedMode',            label: 'Timed mode',             desc: '30 seconds per question' },
            { field: 'detailedExplanations', label: 'Detailed explanations',  desc: 'Show why each answer is correct' },
            { field: 'focusWeakAreas',       label: 'Focus on weak areas',    desc: 'Prioritise topics you got wrong before' },
          ].map(({ field, label, desc }, i, arr) => (
            <div key={field} style={i === arr.length - 1 ? S.toggleRowLast : S.toggleRow}>
              <div>
                <div style={S.toggleLabel}>{label}</div>
                <div style={S.toggleDesc}>{desc}</div>
              </div>
              <button style={S.toggle(settings[field])} onClick={() => toggleBool(field)}>
                <div style={S.toggleThumb(settings[field])} />
              </button>
            </div>
          ))}
        </div>
      )}

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