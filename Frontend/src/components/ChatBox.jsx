import { useState, useRef, useEffect } from 'react'
import BASE_URL from '../config'

export default function ChatBox({ context }) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Reset chat when context changes (new notes/topic generated)
  useEffect(() => {
    setMessages([])
  }, [context])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const updated = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, context }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Network error.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!context) return null

  return (
    <>
      {/* Floating button */}
      <button className="chat-fab" onClick={() => setOpen(o => !o)} title="Chat with your content">
        {open ? '✕' : '💬'}
      </button>

      {/* Chat drawer */}
      {open && (
        <div className="chat-drawer">
          <div className="chat-header">
            <span>💬 Ask about your content</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask anything about your notes or topic!</p>
                <div className="chat-suggestions">
                  {[
                    "Explain this in simpler terms",
                    "What's most important here?",
                    "Give me a real-world example",
                    "What exam questions could come from this?",
                  ].map(s => (
                    <button key={s} className="suggestion-chip"
                      onClick={() => { setInput(s); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <span className="chat-bubble">{m.content}</span>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <span className="chat-bubble typing">
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}