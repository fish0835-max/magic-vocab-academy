import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WordEntry } from '../../types'
import { useTTS } from '../../hooks/useTTS'
import { Button } from '../ui/Button'

interface SpellingChallengeProps {
  word: WordEntry
  onCorrect: () => void
  onWrong: () => void
}

export function SpellingChallenge({ word, onCorrect, onWrong }: SpellingChallengeProps) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const { speak } = useTTS()

  const handleSubmit = () => {
    if (!input.trim()) return
    const normalized = input.trim().toLowerCase()
    if (normalized === word.word.toLowerCase()) {
      setFeedback('correct')
      setTimeout(() => { setFeedback(null); setInput(''); onCorrect() }, 1000)
    } else {
      setFeedback('wrong')
      setTimeout(() => { setFeedback(null) }, 800)
      onWrong()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <p className="text-purple-300 text-lg font-medium">✨ 拼出這個英文單字</p>

      <motion.img
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        src={word.imageUrl}
        alt={word.translation}
        className="w-40 h-40 object-cover rounded-xl border-2 border-purple-500 spell-glow"
        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📖</text></svg>' }}
      />

      <p className="text-2xl text-white font-bold">{word.translation}</p>

      <button
        onClick={() => speak(word.word)}
        className="text-4xl hover:scale-110 transition-transform"
        title="聽發音"
      >
        🔊
      </button>

      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="text-4xl"
          >✨🎉✨</motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ x: -10 }} animate={{ x: [0, -10, 10, -10, 10, 0] }}
            className="text-red-400 font-bold"
          >再試一次！</motion.div>
        )}
      </AnimatePresence>

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="輸入英文單字..."
        className="w-full bg-purple-900/50 border border-purple-500 rounded-lg px-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400 text-lg"
        autoFocus
      />

      <Button onClick={handleSubmit} disabled={!input.trim()} className="w-full text-lg py-3">
        施放咒語！
      </Button>
    </div>
  )
}
