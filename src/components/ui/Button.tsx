import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold'
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  title?: string
}

export function Button({ variant = 'primary', children, className = '', onClick, disabled, type = 'button', title }: ButtonProps) {
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400',
    secondary: 'bg-purple-900/50 hover:bg-purple-800/50 text-purple-200 border border-purple-600',
    danger: 'bg-red-800 hover:bg-red-700 text-white border border-red-600',
    gold: 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      title={title}
    >
      {children}
    </motion.button>
  )
}
