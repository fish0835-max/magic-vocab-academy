import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PHASE_ORDER } from '../types'
import { useGameSession } from '../hooks/useGameSession'
import { SpellingChallenge } from '../components/game/SpellingChallenge'
import { TranslationChallenge } from '../components/game/TranslationChallenge'
import { ClozeChallenge } from '../components/game/ClozeChallenge'
import { HeartBar } from '../components/ui/HeartBar'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const PHASE_LABEL: Record<string, string> = {
  spelling:    '✨ 拼字挑戰',
  translation: '🔮 選圖挑戰',
  cloze:       '📜 克漏字',
}

const PHASE_ICON: Record<string, string> = {
  spelling:    '✨',
  translation: '🔮',
  cloze:       '📜',
}

export function GamePage() {
  const navigate = useNavigate()
  const { session, progress, answerCorrect, answerWrong, resetSession } = useGameSession()

  useEffect(() => {
    if (!session) navigate('/levels')
  }, [session, navigate])

  if (!session) return null

  const { currentPhase, phases, lives, words, completed } = session
  const currentPhaseState = phases[currentPhase]
  const currentWord = currentPhaseState.words[currentPhaseState.currentIndex]
  const isDead = lives <= 0

  const handleCorrect = () => {
    if (currentWord) answerCorrect(currentWord.id)
  }

  // Per-phase progress
  const phaseCorrect = currentPhaseState.correct.length
  const phaseTotal = words.length

  return (
    <div className="min-h-screen magic-gradient flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-800">
        <button onClick={() => navigate('/levels')} className="text-purple-400 hover:text-white">
          ← 退出
        </button>
        <div className="text-center">
          <p className="text-amber-300 font-bold">{PHASE_LABEL[currentPhase]}</p>
          <p className="text-purple-400 text-xs">{session.date}</p>
        </div>
        <HeartBar lives={lives} />
      </div>

      {/* Phase tabs */}
      <div className="flex border-b border-purple-800">
        {PHASE_ORDER.map(phase => {
          const phaseDone = phases[phase].correct.length >= words.length
          const isCurrent = phase === currentPhase
          const phaseIdx = PHASE_ORDER.indexOf(phase)
          const currentIdx = PHASE_ORDER.indexOf(currentPhase)
          const isLocked = phaseIdx > currentIdx && !phaseDone
          return (
            <div
              key={phase}
              className={`flex-1 py-2 text-center text-sm transition-colors ${
                isCurrent
                  ? 'border-b-2 border-amber-400 text-amber-300 font-bold'
                  : phaseDone
                  ? 'text-green-400'
                  : isLocked
                  ? 'text-purple-700'
                  : 'text-purple-400'
              }`}
            >
              {PHASE_ICON[phase]} {phaseDone ? '✓' : `${phases[phase].correct.length}/${words.length}`}
            </div>
          )
        })}
      </div>

      {/* Phase progress bar */}
      <div className="px-4 py-2">
        <div className="flex gap-1">
          {Array.from({ length: phaseTotal }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < phaseCorrect ? 'bg-amber-400' : i === phaseCorrect ? 'bg-purple-400' : 'bg-purple-800'
              }`}
            />
          ))}
        </div>
        <p className="text-purple-400 text-xs mt-1 text-center">
          {phaseCorrect} / {phaseTotal} 個單字
        </p>
      </div>

      {/* Challenge area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {currentWord && !completed && !isDead && (
            <motion.div
              key={`${currentPhase}-${currentWord.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md"
            >
              {currentPhase === 'spelling' && (
                <SpellingChallenge word={currentWord} onCorrect={handleCorrect} onWrong={answerWrong} />
              )}
              {currentPhase === 'translation' && (
                <TranslationChallenge
                  word={currentWord}
                  allWords={words}
                  onCorrect={handleCorrect}
                  onWrong={answerWrong}
                />
              )}
              {currentPhase === 'cloze' && (
                <ClozeChallenge word={currentWord} onCorrect={handleCorrect} onWrong={answerWrong} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completed modal */}
      <Modal isOpen={completed && !isDead} title="✨ 咒語全部學成！">
        <div className="text-center">
          <p className="text-6xl mb-4">🎉</p>
          <p className="text-purple-300 mb-2">恭喜完成三種挑戰！</p>
          <p className="text-amber-300 mb-2">拼字 ✨ → 選圖 🔮 → 克漏字 📜</p>
          <p className="text-amber-300 mb-6">習得 {words.length} 個新咒語！</p>
          {progress.weeklyMedals.length > 0 && (
            <p className="text-amber-400 text-lg mb-4">🏅 獲得週獎章！</p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/levels')}>
              返回關卡
            </Button>
            <Button variant="gold" onClick={() => navigate('/weekly')}>
              查看獎章
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dead modal */}
      <Modal isOpen={isDead} title="💀 魔力耗盡">
        <div className="text-center">
          <p className="text-6xl mb-4">💀</p>
          <p className="text-red-300 mb-6">魔力耗盡，需要重新來過！</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/levels')}>
              放棄
            </Button>
            <Button variant="danger" onClick={resetSession}>
              重新挑戰
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
