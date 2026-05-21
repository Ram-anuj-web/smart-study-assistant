import { useState } from 'react'
import './App.css'
import NoteInput from './components/NoteInput'
import Summary from './components/Summary'
import Quiz from "./components/Quiz";
import Flashcards from './components/Flashcards'

const TABS = [
  { id: 'summary', label: 'Summary', icon: '📝' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { id: 'raw', label: 'Raw JSON', icon: '🔧' },
]

function App() {
  const [activeTab, setActiveTab] = useState('summary')
  const [currentResult, setCurrentResult] = useState(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="app">
      <header className="header">
        <span className="logo-text">AI Smart Assistant</span>
      </header>

      <main className="main">
        <NoteInput
          onGenerate={setCurrentResult}
          loading={loading}
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
          {!currentResult ? (
            <div className="empty-state">
              <div className="empty-icon">
                {TABS.find((t) => t.id === activeTab)?.icon}
              </div>
              <h3>No {activeTab} yet</h3>
              <p>Paste your notes and hit Generate</p>
            </div>
          ) : activeTab === 'summary' ? (
            <Summary data={currentResult} />
          ) : activeTab === 'flashcards' ? (
            <Flashcards data={currentResult} />
          ) : (
  <Quiz data={currentResult} />
)}
        </div>
      </main>
    </div>
  )
}

export default App