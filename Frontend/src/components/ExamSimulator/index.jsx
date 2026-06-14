import { useState } from 'react'
import ExamSetup from './ExamSetup'
import ExamSession from './ExamSession'
import ExamResults from './ExamResults'

export default function ExamSimulator({ userId }) {
  const [phase, setPhase]   = useState('setup')   // setup | session | results
  const [exam, setExam]     = useState(null)
  const [result, setResult] = useState(null)

  function handleExamReady(examData) {
    setExam(examData)
    setPhase('session')
  }

  function handleFinish(resultData) {
    // calculate total time
    const timeTakenTotal = resultData.responses.reduce((sum, r) => sum + (r.timeTaken || 0), 0)
    setResult({ ...resultData, timeTakenTotal })
    setPhase('results')
  }

  function handleRetake() {
    setPhase('session')
    setResult(null)
  }

  function handleNewExam() {
    setExam(null)
    setResult(null)
    setPhase('setup')
  }

  return (
    <div className="exam-wrap">
      {phase === 'setup'   && <ExamSetup userId={userId} onExamReady={handleExamReady} />}
      {phase === 'session' && exam && <ExamSession exam={exam} onFinish={handleFinish} />}
      {phase === 'results' && result && (
        <ExamResults
          result={result}
          userId={userId}
          onRetake={handleRetake}
          onNewExam={handleNewExam}
        />
      )}
    </div>
  )
}