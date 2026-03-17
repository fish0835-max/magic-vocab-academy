import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WordEntry } from '../../types'
import { useTTS } from '../../hooks/useTTS'
import { Button } from '../ui/Button'

interface ClozeChallengeProps {
  word: WordEntry
  onCorrect: () => void
  onWrong: () => void
}

/** Translate an English sentence to Traditional Chinese via Google Translate (client-side). */
async function fetchZhSentence(sentence: string): Promise<string> {
  try {
    const r = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(sentence)}`
    )
    const data = await r.json()
    return (data[0]?.[0]?.[0] as string) ?? ''
  } catch { return '' }
}

/** Pick a random sentence that contains "___". */
function pickSentence(word: WordEntry): string {
  const all = [
    ...(word.sentences ?? []),
    ...(word.sentence ? [word.sentence] : []),
  ].filter(s => s && s.includes('___'))
  if (all.length === 0) return `The word is ___ .`
  return all[Math.floor(Math.random() * all.length)]
}

export function ClozeChallenge({ word, onCorrect, onWrong }: ClozeChallengeProps) {
  // Sentence is locked in when the word arrives (component remounts via key in GamePage)
  const [sentence] = useState(() => pickSentence(word))
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const advancedRef = useRef(false)
  const { speakSentenceWithKeyword, speakClozeSequence, stop } = useTTS()

  const parts = sentence.split('___')
  const fullSentence = sentence.replace('___', word.word)

  // Cancel TTS when word changes
  useEffect(() => {
    advancedRef.current = false
    return () => { stop() }
  }, [word.id, stop])

  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    setFeedback(null)
    setInput('')
    onCorrect()
  }

  const handleSubmit = () => {
    if (!input.trim() || feedback === 'correct') return
    if (input.trim().toLowerCase() === word.word.toLowerCase()) {
      setFeedback('correct')
      // Sequence: Slow EN → Fast EN → ZH sentence → advance
      fetchZhSentence(fullSentence).then(zhSent => {
        speakClozeSequence(fullSentence, zhSent || word.translation, advance)
      })
    } else {
      setFeedback('wrong')
      setTimeout(() => { setFeedback(null) }, 800)
      onWrong()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <p className="text-purple-300 text-lg font-medium">📜 克漏字填填看</p>

      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        src={word.imageUrl}
        alt={word.translation}
        className="w-32 h-32 object-cover rounded-xl border-2 border-purple-500"
        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📖</text></svg>' }}
      />

      {/* 🔊 reads whole sentence; keyword is slowed down */}
      <button
        onClick={() => speakSentenceWithKeyword(fullSentence, word.word)}
        className="text-3xl hover:scale-110 transition-transform"
        title="聽整句（關鍵字放慢）"
      >
        🔊
      </button>

      <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-4 w-full text-center">
        <p className="text-white text-lg leading-relaxed">
          {parts[0]}
          <span className="text-amber-300 font-bold underline decoration-dotted">
            {input || '___'}
          </span>
          {parts[1]}
        </p>
      </div>

      <p className="text-purple-300 text-sm">提示：{word.translation}</p>

      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-4xl">✨🎉✨</span>
            <span className="text-amber-300 text-xs">慢英文 → 快英文 → 中文朗讀中…</span>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ x: -10 }}
            animate={{ x: [0, -10, 10, -10, 10, 0] }}
            className="text-red-400 font-bold"
          >
            再試一次！
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="填入英文單字..."
        disabled={feedback === 'correct'}
        className="w-full bg-purple-900/50 border border-purple-500 rounded-lg px-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400 text-lg disabled:opacity-50"
        autoFocus
      />

      <Button
        onClick={handleSubmit}
        disabled={!input.trim() || feedback === 'correct'}
        className="w-full text-lg py-3"
      >
        施放咒語！
      </Button>
    </div>
  )
}
