import ChatBox from './components/ChatBox'
import { useState, useEffect } from 'react'
import './App.css'
import NoteInput from './components/NoteInput'
import TopicInput from './components/TopicInput'
import TopicParagraph from './components/TopicParagraph'
import Summary from './components/Summary'
import Resources from "./pages/Resources";
import Quiz from './components/Quiz'
import Flashcards from './components/Flashcards'
import Progress from './components/Progress'
import BASE_URL from './config'

const NOTE_TABS = [
  { id: 'summary',    label: 'Summary',    icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'quiz',       label: 'Quiz',       icon: '🧠' },
]

const TOPIC_TABS = [
  { id: 'paragraph',  label: 'Paragraph',  icon: '📄' },
  { id: 'summary',    label: 'Summary',    icon: '📋' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'quiz',       label: 'Quiz',       icon: '🧠' },
]

function getOrCreateUserId() {
  let id = localStorage.getItem('study_user_id')
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('study_user_id', id)
  }
  return id
}

export default function App() {
  const [mode, setMode]                     = useState('notes')
  const [activeNoteTab, setActiveNoteTab]   = useState('summary')
  const [activeTopicTab, setActiveTopicTab] = useState('paragraph')
  const [noteResults, setNoteResults]       = useState({})
  const [topicResults, setTopicResults]     = useState(null)
  const [currentTopic, setCurrentTopic]     = useState(null)
  const [chatContext, setChatContext]        = useState(null)
  const [loading, setLoading]               = useState(false)
  const [theme, setTheme]                   = useState(() => localStorage.getItem('theme') || 'dark')
  const [userId]                            = useState(getOrCreateUserId)
  const [dueCount, setDueCount]             = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!userId) return
    fetch(`${BASE_URL}/api/progress/${userId}/recommendations`)
      .then(r => r.json())
      .then(d => { if (d.success) setDueCount(d.dueCount || 0) })
      .catch(() => {})
  }, [userId])

  function handleNoteGenerate(data, notesText) {
    setNoteResults(data)
    setChatContext(notesText)
    setCurrentTopic(data.summary?.title || "My Notes")
  }

  function handleTopicGenerate(data, topic) {
    setTopicResults(data)
    setCurrentTopic(topic || null)
    setActiveTopicTab('paragraph')
    setChatContext(topic ? `Topic: ${topic}\n\n${data.paragraph || ''}` : null)
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🧠</div>
          <span className="logo-text">AI Smart Assistant</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${mode === 'notes' ? 'active' : ''}`}
            onClick={() => setMode('notes')}
          >
            📓 My Notes
          </button>
          <button
            className={`sidebar-link ${mode === 'topic' ? 'active' : ''}`}
            onClick={() => setMode('topic')}
          >
            🔍 By Topic
          </button>
          <button
            className={`sidebar-link ${mode === 'progress' ? 'active' : ''}`}
            onClick={() => setMode('progress')}
          >
            📊 Progress
            {dueCount > 0 && <span className="due-badge">{dueCount}</span>}
          </button>
          <button
            className={`sidebar-link ${mode === 'resources' ? 'active' : ''}`}
            onClick={() => setMode('resources')}
          >
            📚 Resources
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="header-badge">v2.0</span>
        </div>
      </aside>

      <main className="content-area">

        {/* ── NOTES MODE ── */}
        {mode === 'notes' && (
          <>
            <NoteInput
              onGenerate={handleNoteGenerate}
              loading={loading}
              setLoading={setLoading}
              activeTab={activeNoteTab}
            />
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.5rem',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="tabs">
                {NOTE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeNoteTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveNoteTab(tab.id)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
              <div className="result-area">
                {activeNoteTab === 'summary' && noteResults.summary ? (
                  <Summary data={noteResults.summary} />
                ) : activeNoteTab === 'flashcards' && noteResults.flashcards ? (
                  <Flashcards data={noteResults.flashcards} />
                ) : activeNoteTab === 'quiz' && noteResults.quiz ? (
                  <Quiz data={noteResults.quiz} topic={currentTopic} userId={userId} />
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      {NOTE_TABS.find((t) => t.id === activeNoteTab)?.icon}
                    </div>
                    <h3>No {activeNoteTab} yet</h3>
                    <p>Paste your notes and hit Generate</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── TOPIC MODE ── */}
        {mode === 'topic' && (
          <>
            <TopicInput
              onGenerate={handleTopicGenerate}
              loading={loading}
              setLoading={setLoading}
            />
            {topicResults ? (
              <>
                <div className="tabs">
                  {TOPIC_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${activeTopicTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTopicTab(tab.id)}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
                <div className="result-area">
                  {activeTopicTab === 'paragraph'  && <TopicParagraph text={topicResults.paragraph} />}
                  {activeTopicTab === 'summary'    && <Summary data={topicResults.summary} />}
                  {activeTopicTab === 'flashcards' && <Flashcards data={topicResults.flashcards} />}
                  {activeTopicTab === 'quiz'       && (
                    <Quiz
                      data={topicResults.quiz}
                      topic={currentTopic}
                      userId={userId}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Enter a topic above</h3>
                <p>We'll generate a paragraph, summary, flashcards & quiz</p>
              </div>
            )}
          </>
        )}

        {/* ── PROGRESS MODE ── */}
        {mode === 'progress' && (
          <Progress userId={userId} />
        )}

        {/* ── RESOURCES MODE ── */}
        {mode === 'resources' && (
          <Resources />
        )}

        <ChatBox context={chatContext} />
      </main>
    </div>
  )
}