import { useState } from 'react'
import './App.css'
import NoteInput from './components/NoteInput'
import Summary from './components/Summary'
import Quiz from "./components/Quiz";
import Flashcards from './components/Flashcards'

const TABS = [
  { id: 'summary', label: 'Summary', icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'quiz', label: 'Quiz', icon: '🧠' },
]

function App() {
  const [activeTab, setActiveTab] = useState('summary')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  function handleGenerate(data) {
    setResults((prev) => ({ ...prev, [activeTab]: data }))
  }

  return (
    <div className="app">
      <header className="header">
        <span className="logo-text">AI Smart Assistant</span>
      </header>

      <main className="main">
        <NoteInput
          onGenerate={handleGenerate}
          loading={loading}
          setLoading={setLoading}
          activeTab={activeTab}
        />

        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="result-area">
          {activeTab === 'summary' && results.summary ? (
            <Summary data={results.summary} />
          ) : activeTab === 'flashcards' && results.flashcards ? (
            <Flashcards data={results.flashcards} />
          ) : activeTab === 'quiz' && results.quiz ? (
            <Quiz data={results.quiz} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                {TABS.find((t) => t.id === activeTab)?.icon}
              </div>
              <h3>No {activeTab} yet</h3>
              <p>Paste your notes and hit Generate</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App