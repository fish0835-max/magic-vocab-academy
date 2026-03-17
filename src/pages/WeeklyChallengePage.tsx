import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameSession } from '../hooks/useGameSession'
import { getWeekDates, getCurrentWeekKey } from '../utils/weekUtils'
import { SpellbookCard } from '../components/ui/SpellbookCard'
import { sampleWords } from '../data/sampleWords'

export function WeeklyChallengePage() {
  const navigate = useNavigate()
  const { progress } = useGameSession()

  const currentWeek = getCurrentWeekKey()
  const weekDates = getWeekDates(currentWeek)
  const completedThisWeek = weekDates.filter(d => progress.completedLevels.includes(d))
  const hasCurrentMedal = progress.weeklyMedals.includes(currentWeek)

  const masteredWords = sampleWords.filter(w => progress.spellbook.includes(w.id))

  return (
    <div className="min-h-screen magic-gradient p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-purple-400 hover:text-white">
            ← 返回
          </button>
          <h1 className="text-3xl font-bold text-amber-300">週挑戰</h1>
        </div>

        {/* Current week */}
        <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">本週進度 — {currentWeek}</h2>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDates.map((date, i) => {
              const done = progress.completedLevels.includes(date)
              const days = ['一', '二', '三', '四', '五', '六', '日']
              return (
                <div
                  key={date}
                  className={`rounded-lg p-2 text-center border ${
                    done ? 'border-amber-400 bg-amber-900/30' : 'border-purple-700 bg-purple-900/30'
                  }`}
                >
                  <p className="text-xs text-purple-400">週{days[i]}</p>
                  <p className="text-lg">{done ? '✅' : '⬜'}</p>
                </div>
              )
            })}
          </div>
          <p className="text-purple-300 text-center">
            {completedThisWeek.length} / 7 天完成
          </p>
          {hasCurrentMedal && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="mt-4 text-center"
            >
              <p className="text-4xl">🏅</p>
              <p className="text-amber-300 font-bold">本週獎章已獲得！</p>
            </motion.div>
          )}
        </div>

        {/* All medals */}
        <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🏆 獎章收藏</h2>
          {progress.weeklyMedals.length === 0 ? (
            <p className="text-purple-400 text-center">還沒有獎章，繼續加油！</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {progress.weeklyMedals.map(week => (
                <div key={week} className="bg-amber-900/30 border border-amber-500 rounded-lg px-3 py-2 text-center gold-glow">
                  <p className="text-2xl">🏅</p>
                  <p className="text-amber-300 text-xs">{week}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spellbook */}
        <div className="bg-purple-900/50 border border-purple-600 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📚 咒語書 ({masteredWords.length} 個)</h2>
          {masteredWords.length === 0 ? (
            <p className="text-purple-400 text-center">完成關卡後，單字將收入咒語書！</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {masteredWords.map(w => <SpellbookCard key={w.id} word={w} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
