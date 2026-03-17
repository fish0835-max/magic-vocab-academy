import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { useGameSession } from '../hooks/useGameSession'

export function HomePage() {
  const navigate = useNavigate()
  const { progress } = useGameSession()

  return (
    <div className="min-h-screen magic-gradient flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <div className="text-8xl mb-4">🏰</div>
        <h1 className="text-5xl font-bold text-amber-300 mb-2" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
          魔法學院
        </h1>
        <h2 className="text-2xl text-purple-300">英語遊戲</h2>
        <p className="text-purple-400 mt-2">Hogwarts English Academy</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        <Button variant="gold" onClick={() => navigate('/levels')} className="text-xl py-4 gold-glow">
          ⚡ 開始冒險
        </Button>
        <Button variant="secondary" onClick={() => navigate('/weekly')} className="py-3">
          🏆 週挑戰獎章
        </Button>
        <Button variant="secondary" onClick={() => navigate('/tools/photo-parser')} className="py-3">
          📷 題庫製作工具
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-purple-400"
      >
        <p>已收集咒語：{progress.spellbook.length} 個</p>
        <p>完成關卡：{progress.completedLevels.length} 天</p>
        <p>週獎章：{progress.weeklyMedals.length} 枚</p>
      </motion.div>
    </div>
  )
}
