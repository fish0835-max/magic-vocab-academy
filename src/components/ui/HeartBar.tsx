import { motion } from 'framer-motion'

interface HeartBarProps {
  lives: number
  maxLives?: number
}

export function HeartBar({ lives, maxLives = 3 }: HeartBarProps) {
  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: maxLives }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ scale: i < lives ? 1 : 0.8 }}
          className={`text-2xl transition-all ${i < lives ? 'opacity-100' : 'opacity-30 grayscale'}`}
        >
          ❤️
        </motion.span>
      ))}
    </div>
  )
}
