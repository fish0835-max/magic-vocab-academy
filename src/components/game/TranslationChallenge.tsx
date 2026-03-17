import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WordEntry } from '../../types'
import { useTTS } from '../../hooks/useTTS'

interface TranslationChallengeProps {
  word: WordEntry
  allWords: WordEntry[]
  onCorrect: () => void
  onWrong: () => void
}

export function TranslationChallenge({ word, allWords, onCorrect, onWrong }: TranslationChallengeProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const { speak } = useTTS()

  const choices = useMemo(() => {
    const others = allWords.filter(w => w.id !== word.id)
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
    return [...shuffled, word].sort(() => Math.random() - 0.5)
  }, [word, allWords])

  const handleSelect = (choice: WordEntry) => {
    if (feedback) return
    setSelected(choice.id)
    if (choice.id === word.id) {
      setFeedback('correct')
      setTimeout(() => { setFeedback(null); setSelected(null); onCorrect() }, 1000)
    } else {
      setFeedback('wrong')
      setTimeout(() => { setFeedback(null); setSelected(null) }, 800)
      onWrong()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <p className="text-purple-300 text-lg font-medium">🔮 聽音選圖</p>

      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold text-amber-300">{word.word}</span>
        <button onClick={() => speak(word.word)} className="text-3xl hover:scale-110 transition-transform">
          🔊
        </button>
      </div>

      <p className="text-purple-300">選出正確的圖片：</p>

      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-4xl">
            ✨🎉✨
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4 w-full">
        {choices.map(choice => (
          <motion.button
            key={choice.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(choice)}
            className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
              selected === choice.id
                ? choice.id === word.id
                  ? 'border-green-400 bg-green-900/30'
                  : 'border-red-400 bg-red-900/30'
                : 'border-purple-500 hover:border-amber-400'
            }`}
          >
            <img
              src={choice.imageUrl}
              alt={choice.translation}
              className="w-full h-28 object-cover"
              onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📖</text></svg>' }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1">
              <p className="text-white text-xs text-center">{choice.translation}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
