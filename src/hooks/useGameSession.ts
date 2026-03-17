import { useContext } from 'react'
import { GameContext } from '../store/GameContext'

export function useGameSession() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameSession must be used inside GameProvider')
  return ctx
}
