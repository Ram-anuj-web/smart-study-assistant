import { useState } from 'react'
import './App.css'
import NoteInput from './components/NoteInput'
import TopicInput from './components/TopicInput'
import TopicParagraph from './components/TopicParagraph'
import Summary from './components/Summary'
import Quiz from './components/Quiz'
import Flashcards from './components/Flashcards'

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

export default function App() {
  const [mode, setMode]                     = useState('notes')
  const [activeNoteTab, setActiveNoteTab]   = useState('summary')
  const [activeTopicTab, setActiveTopicTab] = useState('paragraph')
  const [noteResults, setNoteResults]       = useState({})
  const [topicResults, setTopicResults]     = useState(null)
  const [loading, setLoading]               = useState(false)

function handleNoteGenerate(data) {
  setNoteResults(data);
}
  function handleTopicGenerate(data) {
    setTopicResults(data)
    setActiveTopicTab('paragraph')
  }

  return (
    <div className="app">
      <header className="header">
        <span className="logo-text">AI Smart Assistant</span>
        <span className="header-badge">v2.0</span>
      </header>

      <main className="main">

        {/* Mode switcher */}
        <div className="tabs">
          <button
            className={`tab-btn ${mode === 'notes' ? 'active' : ''}`}
            onClick={() => setMode('notes')}
          >
            📓 My Notes
          </button>
          <button
            className={`tab-btn ${mode === 'topic' ? 'active' : ''}`}
            onClick={() => setMode('topic')}
          >
            🔍 By Topic
          </button>
        </div>

        {/* NOTES MODE */}
        {mode === 'notes' && (
          <>
            <NoteInput
              onGenerate={handleNoteGenerate}
              loading={loading}
              setLoading={setLoading}
              activeTab={activeNoteTab}
            />
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
                <Quiz data={noteResults.quiz} />
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
          </>
        )}

        {/* TOPIC MODE */}
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
                  {activeTopicTab === 'quiz'       && <Quiz data={topicResults.quiz} />}
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

      </main>
    </div>
  )
}