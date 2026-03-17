import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WordEntry } from '../types'
import { useGameSession } from '../hooks/useGameSession'
import { groupByDate } from '../data/loader'
import { sampleWords } from '../data/sampleWords'
import { getWeekKey } from '../utils/weekUtils'
import { loadWordBank, clearWordBank } from '../utils/wordBank'
import { Button } from '../components/ui/Button'
import { apiGetWordBank, apiSaveWordBank, apiVerifyPin, apiClearWordBank } from '../utils/serverApi'

const PIN_KEY = 'englishcard_pin'

export function LevelSelectPage() {
  const navigate = useNavigate()
  const { progress, startLevel, startMultiLevel } = useGameSession()
  const [wordsByDate, setWordsByDate] = useState<Record<string, WordEntry[]>>({})
  const [source, setSource] = useState<'server-bank' | 'local-bank' | 'json' | 'sample'>('sample')

  // Multi-select state
  const [multiMode, setMultiMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  // PIN modal state
  const [pinTarget, setPinTarget] = useState<string | null>(null)  // date pending edit
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  const reload = useCallback(async () => {
    let words: WordEntry[] = []

    try {
      words = await apiGetWordBank()
    } catch {
      // server offline — fall through to localStorage
    }

    if (words.length > 0) {
      setWordsByDate(groupByDate(words))
      setSource('server-bank')
      return
    }

    const banked = loadWordBank()
    if (banked.length > 0) {
      setWordsByDate(groupByDate(banked))
      setSource('local-bank')
      return
    }
    fetch('/data/words.json')
      .then(r => r.json())
      .then((data: WordEntry[]) => { setWordsByDate(groupByDate(data)); setSource('json') })
      .catch(() => { setWordsByDate(groupByDate(sampleWords)); setSource('sample') })
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleClearBank = async () => {
    if (!confirm('確定要清除已匯入的題庫嗎？')) return
    clearWordBank()
    try { await apiClearWordBank() } catch { /* ignore */ }
    reload()
  }

  const handleSyncToServer = async () => {
    const banked = loadWordBank()
    if (!banked.length) return
    try {
      await apiSaveWordBank(banked)
      await reload()
    } catch {
      alert('同步失敗，請確認伺服器已啟動')
    }
  }

  const dates = Object.keys(wordsByDate).sort()

  const openPinModal = (date: string) => {
    setPinTarget(date)
    setPinInput('')
    setPinError(false)
  }

  const confirmPin = async () => {
    let ok: boolean
    try {
      ok = await apiVerifyPin(pinInput)
    } catch {
      // Server offline: fall back to localStorage
      ok = pinInput.toUpperCase() === (localStorage.getItem(PIN_KEY) ?? '0000').toUpperCase()
    }

    if (ok) {
      const date = pinTarget!
      setPinTarget(null)
      navigate('/tools/photo-parser', {
        state: { words: wordsByDate[date], date },
      })
    } else {
      setPinError(true)
      setPinInput('')
    }
  }

  // Single-date start
  const handleStartLevel = (date: string) => {
    const words = wordsByDate[date]
    if (!words?.length) return
    startLevel(date, words)
    navigate('/game')
  }

  // Multi-date start
  const handleStartMulti = () => {
    if (!selectedDates.length) return
    const combined = selectedDates.flatMap(d => wordsByDate[d] ?? [])
    startMultiLevel(selectedDates, combined)
    navigate('/game')
  }

  // Toggle selection in multi mode
  const toggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  const exitMultiMode = () => {
    setMultiMode(false)
    setSelectedDates([])
  }

  return (
    <div className="min-h-screen magic-gradient p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-purple-400 hover:text-white transition-colors">
              ← 返回
            </button>
            <h1 className="text-3xl font-bold text-amber-300">選擇關卡</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${
              source === 'server-bank' ? 'bg-green-900/50 text-green-300 border border-green-600' :
              source === 'local-bank'  ? 'bg-amber-900/50 text-amber-300 border border-amber-600' :
              source === 'json'        ? 'bg-purple-900/50 text-purple-300 border border-purple-600' :
                                         'bg-purple-950 text-purple-500 border border-purple-800'
            }`}>
              {source === 'server-bank' ? '🌐 伺服器題庫' :
               source === 'local-bank'  ? '💾 本地題庫' :
               source === 'json'        ? '📄 words.json' : '🧪 範例'}
            </span>
            {source === 'local-bank' && (
              <button onClick={handleSyncToServer} className="text-green-400 hover:text-green-300 text-xs">
                ⬆️ 同步到伺服器
              </button>
            )}
            {(source === 'local-bank' || source === 'server-bank') && (
              <button onClick={handleClearBank} className="text-red-400 hover:text-red-300 text-xs">
                清除
              </button>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        {dates.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            {multiMode ? (
              <>
                <button
                  onClick={exitMultiMode}
                  className="text-purple-400 hover:text-white text-sm"
                >
                  ✕ 取消多選
                </button>
                <span className="text-purple-400 text-sm">
                  已選 {selectedDates.length} 天（{selectedDates.flatMap(d => wordsByDate[d] ?? []).length} 個單字）
                </span>
                <button
                  onClick={() => setSelectedDates(dates)}
                  className="text-purple-400 hover:text-amber-300 text-xs"
                >
                  全選
                </button>
              </>
            ) : (
              <button
                onClick={() => setMultiMode(true)}
                className="text-purple-400 hover:text-amber-300 text-sm border border-purple-700 rounded-lg px-3 py-1 transition-colors"
              >
                ☑ 多選模式
              </button>
            )}
          </div>
        )}

        {/* Level cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {dates.map((date, i) => {
            const isCompleted = progress.completedLevels.includes(date)
            const wordCount = wordsByDate[date]?.length ?? 0
            const week = getWeekKey(new Date(date))
            const hasMedal = progress.weeklyMedals.includes(week)
            const isSelected = selectedDates.includes(date)

            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <button
                  onClick={() => multiMode ? toggleDate(date) : handleStartLevel(date)}
                  className={`w-full rounded-xl p-4 border-2 transition-all text-left ${
                    multiMode && isSelected
                      ? 'border-amber-400 bg-amber-900/40 ring-2 ring-amber-400/50'
                      : isCompleted
                      ? 'border-amber-400 bg-amber-900/30 gold-glow'
                      : 'border-purple-600 bg-purple-900/30 hover:border-purple-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">
                      {multiMode
                        ? (isSelected ? '☑' : '☐')
                        : (isCompleted ? '✅' : '📚')}
                    </span>
                    {hasMedal && !multiMode && <span className="text-xl">🏅</span>}
                  </div>
                  <p className="text-white font-bold text-sm">{date}</p>
                  <p className="text-purple-300 text-xs">{wordCount} 個單字</p>
                  {isCompleted && !multiMode && (
                    <p className="text-amber-400 text-xs mt-1">已通關！</p>
                  )}
                </button>

                {/* Edit button — only visible in normal mode */}
                {!multiMode && (
                  <button
                    onClick={e => { e.stopPropagation(); openPinModal(date) }}
                    className="absolute top-2 right-2 text-purple-500 hover:text-amber-300 text-xs bg-purple-950/80 rounded px-1.5 py-0.5 transition-colors"
                    title="編輯此日單字（需密碼）"
                  >
                    ✏️
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Multi-select start button */}
        {multiMode && selectedDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex justify-center"
          >
            <Button variant="gold" onClick={handleStartMulti} className="text-lg py-3 px-8 gold-glow">
              ⚡ 開始挑戰 ({selectedDates.length} 天 · {selectedDates.flatMap(d => wordsByDate[d] ?? []).length} 字)
            </Button>
          </motion.div>
        )}

        {dates.length === 0 && (
          <div className="text-center text-purple-400 mt-12">
            <p className="text-4xl mb-4">📖</p>
            <p>還沒有題庫</p>
            <p className="text-sm mt-2">請使用題庫製作工具匯入單字</p>
            <Button variant="secondary" onClick={() => navigate('/tools/photo-parser')} className="mt-4">
              前往製作工具
            </Button>
          </div>
        )}
      </div>

      {/* PIN modal */}
      {pinTarget !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-purple-950 border border-purple-500 rounded-2xl p-6 w-full max-w-xs text-center"
          >
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-amber-300 font-bold mb-1">輸入編輯密碼</p>
            <p className="text-purple-400 text-xs mb-4">預設密碼：0000</p>
            <input
              autoFocus
              type="password"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.slice(0, 4)); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && confirmPin()}
              placeholder="• • • •"
              maxLength={4}
              className="w-full text-center text-2xl tracking-widest bg-purple-900/50 border border-purple-500 rounded-xl px-4 py-3 text-white placeholder-purple-700 focus:outline-none focus:border-amber-400 mb-3"
            />
            {pinError && (
              <p className="text-red-400 text-sm mb-3">密碼錯誤，請再試一次</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPinTarget(null)}
                className="flex-1 py-2 rounded-xl border border-purple-600 text-purple-400 hover:text-white transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmPin}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors text-sm"
              >
                確認
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
