import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WordEntry } from '../../types'
import { recognizeText } from '../../utils/ocr'
import { saveToWordBank, replaceWordsByIds } from '../../utils/wordBank'
import { Button } from '../../components/ui/Button'
import { apiSaveWordBank, apiChangePin, apiUploadImage } from '../../utils/serverApi'

const CLAUDE_KEY = 'englishcard_claude_key'

function generateId() {
  return `w${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

interface FillResult {
  translation: string
  imageUrl: string
  sentence: string
  sentences?: string[]
  error?: string
}

export function PhotoParserPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { words?: WordEntry[]; date?: string } | null

  // In edit-session mode, track original IDs so deletions are honoured on save
  const originalIdsRef = useRef<Set<string>>(
    new Set((locationState?.words ?? []).map(w => w.id))
  )
  const isEditSession = originalIdsRef.current.size > 0

  const fileRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const uploadRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [words, setWords] = useState<WordEntry[]>(() => locationState?.words ?? [])
  const [date, setDate] = useState(locationState?.date ?? new Date().toISOString().split('T')[0])

  // Settings
  const [showSettings, setShowSettings] = useState(false)
  const [claudeKey, setClaudeKey] = useState(
    () => localStorage.getItem(CLAUDE_KEY) ?? ''
  )

  // PIN change (in settings panel)
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')

  const savePin = async () => {
    if (!/^[A-Za-z0-9]{4}$/.test(newPin)) {
      setPinMsg('密碼需為 4 碼英數字')
      return
    }
    const upper = newPin.toUpperCase()
    try {
      await apiChangePin(upper)
    } catch {
      // Server offline: fall back to localStorage
      localStorage.setItem('englishcard_pin', upper)
    }
    setNewPin('')
    setPinMsg('密碼已更新！')
    setTimeout(() => setPinMsg(''), 2000)
  }

  // Fill state
  const [fillStatus, setFillStatus] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})
  const [fillErrors, setFillErrors] = useState<Record<string, string>>({})
  const [isBulkFilling, setIsBulkFilling] = useState(false)

  const saveSettings = () => {
    localStorage.setItem(CLAUDE_KEY, claudeKey)
    setShowSettings(false)
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageUpload = async (index: number, file: File) => {
    try {
      const url = await apiUploadImage(file)
      updateWord(index, 'imageUrl', url)
    } catch (err) {
      alert('圖片上傳失敗：' + String(err))
    }
  }

  // ── OCR ───────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    setIsProcessing(true)
    try {
      const text = await recognizeText(file)
      setOcrText(text)
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const parsed: WordEntry[] = lines.map(line => ({
        id: generateId(),
        word: line.split(/\s+/)[0] ?? line,
        translation: '',
        imageUrl: '',
        date,
        sentence: '',
        sentences: [],
      }))
      setWords(parsed)
      setFillStatus({})
      setFillErrors({})
    } catch (e) {
      setOcrText('OCR 失敗：' + String(e))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Word editor ───────────────────────────────────────────────────────────

  const updateWord = (index: number, field: keyof WordEntry, value: string) => {
    setWords(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w))
  }

  const removeWord = (index: number) => {
    setWords(prev => prev.filter((_, i) => i !== index))
  }

  const addWord = () => {
    setWords(prev => [...prev, { id: generateId(), word: '', translation: '', imageUrl: '', date, sentence: '', sentences: [] }])
  }

  const updateSentence = (wordIndex: number, sentIndex: number, value: string) => {
    setWords(prev => prev.map((w, i) => {
      if (i !== wordIndex) return w
      const sents = [...(w.sentences ?? [])]
      sents[sentIndex] = value
      return { ...w, sentences: sents }
    }))
  }

  const addSentence = (wordIndex: number) => {
    setWords(prev => prev.map((w, i) => {
      if (i !== wordIndex) return w
      return { ...w, sentences: [...(w.sentences ?? []), ''] }
    }))
  }

  const removeSentence = (wordIndex: number, sentIndex: number) => {
    setWords(prev => prev.map((w, i) => {
      if (i !== wordIndex) return w
      const sents = (w.sentences ?? []).filter((_, si) => si !== sentIndex)
      return { ...w, sentences: sents }
    }))
  }

  // ── Auto-fill ─────────────────────────────────────────────────────────────

  const applyFill = (wordId: string, result: FillResult) => {
    setWords(prev => prev.map(w => {
      if (w.id !== wordId) return w
      // Only fill sentences if the word has none yet
      const existing = w.sentences ?? []
      const hasSentences = existing.filter(s => s.trim()).length > 0
      const incomingSents = result.sentences?.length
        ? result.sentences
        : result.sentence ? [result.sentence] : []
      const merged = hasSentences ? existing : incomingSents.filter(s => s.trim())
      return {
        ...w,
        translation: w.translation.trim() ? w.translation : result.translation,
        imageUrl:    w.imageUrl.trim()    ? w.imageUrl    : result.imageUrl,
        sentence:    merged[0] ?? w.sentence ?? '',
        sentences:   merged,
      }
    }))
  }

  const fillOneScrape = async (word: WordEntry) => {
    if (!word.word.trim()) return
    setFillStatus(s => ({ ...s, [word.id]: 'loading' }))
    setFillErrors(e => ({ ...e, [word.id]: '' }))
    try {
      const res = await fetch(`/api/fill/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.word }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: FillResult = await res.json()
      applyFill(word.id, data)
      setFillStatus(s => ({ ...s, [word.id]: 'done' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFillStatus(s => ({ ...s, [word.id]: 'error' }))
      setFillErrors(e => ({ ...e, [word.id]: `爬蟲失敗：${msg}。請確認後端伺服器已啟動 (cd server && start.bat)` }))
    }
  }

  const fillOneClaude = async (word: WordEntry) => {
    if (!word.word.trim()) return
    if (!claudeKey) {
      setShowSettings(true)
      setFillErrors(e => ({ ...e, [word.id]: '請先在設定中填入 Claude API Key' }))
      return
    }
    setFillStatus(s => ({ ...s, [word.id]: 'loading' }))
    setFillErrors(e => ({ ...e, [word.id]: '' }))
    try {
      const res = await fetch(`/api/fill/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.word, api_key: claudeKey }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: FillResult = await res.json()
      if (data.error) {
        setFillStatus(s => ({ ...s, [word.id]: 'error' }))
        setFillErrors(e => ({ ...e, [word.id]: data.error! }))
        return
      }
      applyFill(word.id, data)
      setFillStatus(s => ({ ...s, [word.id]: 'done' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFillStatus(s => ({ ...s, [word.id]: 'error' }))
      setFillErrors(e => ({ ...e, [word.id]: `AI 填充失敗：${msg}。請確認後端伺服器已啟動` }))
    }
  }

  const bulkFill = async (mode: 'scrape' | 'claude') => {
    const targets = words.filter(w => w.word.trim())
    if (!targets.length) return
    setIsBulkFilling(true)
    for (const w of targets) {
      if (mode === 'scrape') await fillOneScrape(w)
      else await fillOneClaude(w)
    }
    setIsBulkFilling(false)
  }

  // ── Export ────────────────────────────────────────────────────────────────

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `words_${date}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const header = 'id,word,translation,imageurl,date,sentences'
    const rows = words.map(w => {
      // Combine sentences into semicolon-separated string for CSV
      const allSents = (w.sentences ?? []).length
        ? w.sentences!
        : w.sentence ? [w.sentence] : []
      return [w.id, w.word, w.translation, w.imageUrl, w.date, allSents.join(';')]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `words_${date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen magic-gradient p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-purple-400 hover:text-white">← 返回</button>
            <h1 className="text-3xl font-bold text-amber-300">📷 題庫製作工具</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-purple-400 hover:text-white text-xl"
            title="設定"
          >⚙️</button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-purple-900/70 border border-purple-500 rounded-xl p-4 mb-6"
          >
            <h3 className="text-amber-300 font-bold mb-3">⚙️ 自動填充設定</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-purple-300 w-28 shrink-0">Claude API Key</label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={e => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <p className="text-purple-500 text-xs">
                需先啟動後端：<code className="bg-purple-950 px-1 rounded">cd server &amp;&amp; start.bat</code>
              </p>
            </div>
            <Button variant="secondary" onClick={saveSettings} className="mt-3 text-sm">
              儲存設定
            </Button>

            {/* PIN change */}
            <div className="mt-4 border-t border-purple-700 pt-4">
              <p className="text-amber-300 text-xs font-bold mb-2">🔒 修改編輯密碼</p>
              <div className="flex items-center gap-2">
                <input
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value.toUpperCase().slice(0, 4)); setPinMsg('') }}
                  placeholder="新密碼（4碼英數字）"
                  maxLength={4}
                  className="w-36 bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white font-mono text-sm tracking-widest"
                />
                <button
                  onClick={savePin}
                  className="text-xs text-amber-400 hover:text-white bg-purple-800/50 rounded px-3 py-1"
                >
                  更新
                </button>
              </div>
              {pinMsg && (
                <p className={`text-xs mt-1 ${pinMsg.includes('已更新') ? 'text-green-400' : 'text-red-400'}`}>
                  {pinMsg}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-purple-500 rounded-xl p-8 text-center mb-6 cursor-pointer hover:border-amber-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          {/* Image file picker */}
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {/* JSON file picker */}
          <input
            ref={jsonRef} type="file" accept=".json" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              const reader = new FileReader()
              reader.onload = ev => {
                try {
                  const data = JSON.parse(ev.target?.result as string) as WordEntry[]
                  setWords(data)
                  setFillStatus({})
                  setFillErrors({})
                  if (data[0]?.date) setDate(data[0].date)
                } catch { alert('JSON 格式錯誤') }
              }
              reader.readAsText(f)
            }}
          />
          {preview ? (
            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg" />
          ) : (
            <>
              <p className="text-4xl mb-2">📸</p>
              <p className="text-purple-300">點擊或拖曳<strong>圖片</strong>到此處 (OCR)</p>
              <p className="text-purple-500 text-sm">支援 JPG、PNG、WEBP</p>
              <div className="mt-3 border-t border-purple-700 pt-3">
                <button
                  onClick={e => { e.stopPropagation(); jsonRef.current?.click() }}
                  className="text-purple-400 hover:text-amber-300 text-sm transition-colors"
                >
                  📂 或直接載入已有的 words.json
                </button>
              </div>
            </>
          )}
        </div>

        {isProcessing && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-center text-amber-300 mb-6"
          >
            🔮 OCR 辨識中...
          </motion.div>
        )}

        {ocrText && (
          <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-4 mb-6">
            <h3 className="text-amber-300 font-bold mb-2">辨識結果</h3>
            <pre className="text-purple-300 text-sm whitespace-pre-wrap">{ocrText}</pre>
          </div>
        )}

        {/* Date + bulk fill buttons */}
        {words.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-purple-300 text-sm">關卡日期：</label>
              <input
                type="date" value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-purple-900/50 border border-purple-500 rounded-lg px-3 py-1 text-white text-sm"
              />
            </div>
            <Button
              variant="secondary"
              disabled={isBulkFilling}
              onClick={() => bulkFill('scrape')}
              title="使用免費公開 API（翻譯/圖片/例句）批次填充空白欄位"
            >
              🕷 爬蟲填充全部
            </Button>
            <Button
              variant="gold"
              disabled={isBulkFilling || !claudeKey}
              onClick={() => bulkFill('claude')}
              title="使用 Claude AI 批次填充空白欄位（需 API Key）"
            >
              🤖 Claude AI 填充全部
            </Button>
            {isBulkFilling && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-amber-300 text-sm"
              >
                填充中...
              </motion.span>
            )}
          </div>
        )}

        {/* Word editor */}
        {words.length > 0 && (
          <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-4 mb-6">
            <h3 className="text-amber-300 font-bold mb-4">編輯單字 ({words.length} 個)</h3>
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {words.map((w, i) => {
                const status = fillStatus[w.id] ?? 'idle'
                return (
                  <div key={w.id} className={`flex gap-2 items-start rounded-lg p-3 border transition-colors ${
                    status === 'done'    ? 'bg-green-900/20 border-green-700' :
                    status === 'loading' ? 'bg-amber-900/20 border-amber-700' :
                    status === 'error'   ? 'bg-red-900/20 border-red-700' :
                    'bg-purple-800/30 border-transparent'
                  }`}>
                    <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                      <input
                        value={w.word}
                        onChange={e => updateWord(i, 'word', e.target.value)}
                        placeholder="英文 *"
                        className="bg-purple-900/50 border border-amber-600 rounded px-2 py-1 text-white"
                      />
                      <input
                        value={w.translation}
                        onChange={e => updateWord(i, 'translation', e.target.value)}
                        placeholder="中文"
                        className="bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white"
                      />
                      <div className="col-span-2 flex gap-1">
                        <input
                          value={w.imageUrl}
                          onChange={e => updateWord(i, 'imageUrl', e.target.value)}
                          placeholder="圖片 URL"
                          className="flex-1 bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => { uploadRefs.current[i] = el }}
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) handleImageUpload(i, f)
                            e.target.value = ''
                          }}
                        />
                        <button
                          onClick={() => uploadRefs.current[i]?.click()}
                          className="text-xs text-purple-300 hover:text-amber-300 bg-purple-800/50 rounded px-2 py-1 shrink-0"
                          title="上傳圖片到伺服器"
                        >📎</button>
                      </div>
                      {/* Multi-sentence editor */}
                      <div className="col-span-2 flex flex-col gap-1">
                        {(w.sentences ?? []).length === 0 && (
                          <p className="text-purple-500 text-xs">尚無例句（填充後自動加入）</p>
                        )}
                        {(w.sentences ?? []).map((s, si) => (
                          <div key={si} className="flex gap-1">
                            <input
                              value={s}
                              onChange={e => updateSentence(i, si, e.target.value)}
                              placeholder={`例句 ${si + 1}（用 ___ 標記空格）`}
                              className="flex-1 bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white text-xs"
                            />
                            <button
                              onClick={() => removeSentence(i, si)}
                              className="text-red-400 hover:text-red-300 text-xs px-1"
                              title="刪除此例句"
                            >✕</button>
                          </div>
                        ))}
                        <button
                          onClick={() => addSentence(i)}
                          className="text-purple-400 hover:text-amber-300 text-xs text-left"
                        >+ 新增例句</button>
                      </div>
                      {fillErrors[w.id] && (
                        <p className="text-red-400 text-xs col-span-2 break-words">{fillErrors[w.id]}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => fillOneScrape(w)}
                        disabled={status === 'loading'}
                        className="text-xs text-purple-300 hover:text-white bg-purple-800/50 rounded px-2 py-1"
                        title="爬蟲填充此行"
                      >🕷</button>
                      <button
                        onClick={() => fillOneClaude(w)}
                        disabled={status === 'loading'}
                        className="text-xs text-amber-400 hover:text-white bg-purple-800/50 rounded px-2 py-1"
                        title="Claude AI 填充此行"
                      >🤖</button>
                      <button
                        onClick={() => removeWord(i)}
                        className="text-xs text-red-400 hover:text-red-300 bg-purple-800/50 rounded px-2 py-1"
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="secondary" onClick={addWord} className="mt-3 text-sm">
              + 新增單字
            </Button>
          </div>
        )}

        {/* Import + Export buttons */}
        {words.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            {/* Primary: direct import into the game */}
            <Button
              variant="gold"
              onClick={async () => {
                const valid = words.filter(w => w.word?.trim())
                if (!valid.length) return
                try {
                  await apiSaveWordBank(
                    valid,
                    isEditSession ? [...originalIdsRef.current] : undefined
                  )
                } catch {
                  // Server offline: fall back to localStorage
                  if (isEditSession) {
                    replaceWordsByIds(originalIdsRef.current, valid)
                  } else {
                    saveToWordBank(valid)
                  }
                  alert('無法連線到伺服器，已改存到本機。如需跨裝置共享，請確認伺服器已啟動。')
                }
                navigate('/levels')
              }}
              className="text-lg py-3 px-6 gold-glow"
            >
              {isEditSession ? '💾 儲存關卡' : '📥 匯入遊戲'}
            </Button>

            {/* Secondary: file exports for backup */}
            <Button variant="secondary" onClick={exportJSON}>💾 備份 JSON</Button>
            <Button variant="secondary" onClick={exportCSV}>📊 備份 CSV</Button>
          </div>
        )}
      </div>
    </div>
  )
}
