import { createContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react'
import { GameState, GameAction, WordEntry, PlayerProgress } from '../types'
import { gameReducer, initialState } from './gameReducer'
import { getWeekDates, getCurrentWeekKey } from '../utils/weekUtils'

const STORAGE_KEY = 'englishcard_progress'

interface GameContextValue extends GameState {
  dispatch: React.Dispatch<GameAction>
  startLevel: (date: string, words: WordEntry[]) => void
  startMultiLevel: (dates: string[], words: WordEntry[]) => void
  answerCorrect: (wordId: string) => void
  answerWrong: () => void
  resetSession: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const completedRef = useRef<string | null>(null)
  const multiDatesRef = useRef<string[]>([])

  // Load persisted progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as PlayerProgress
        dispatch({ type: 'LOAD_PROGRESS', payload: parsed })
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Save progress whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress))
  }, [state.progress])

  // Dispatch COMPLETE_LEVEL once when session finishes all phases (each date individually)
  useEffect(() => {
    if (!state.session?.completed) return
    const date = state.session.date
    if (completedRef.current === date) return
    completedRef.current = date
    const dates = multiDatesRef.current.length > 0 ? multiDatesRef.current : [date]
    dates.forEach(d => dispatch({ type: 'COMPLETE_LEVEL', payload: { date: d } }))
  }, [state.session?.completed, state.session?.date])

  // Award weekly medal when all 7 days in week are completed
  useEffect(() => {
    const weekKey = getCurrentWeekKey()
    const weekDates = getWeekDates(weekKey)
    const allDone = weekDates.every(d => state.progress.completedLevels.includes(d))
    if (allDone && !state.progress.weeklyMedals.includes(weekKey)) {
      dispatch({ type: 'AWARD_MEDAL', payload: { week: weekKey } })
    }
  }, [state.progress.completedLevels, state.progress.weeklyMedals])

  const startLevel = useCallback((date: string, words: WordEntry[]) => {
    completedRef.current = null
    multiDatesRef.current = [date]
    dispatch({ type: 'START_SESSION', payload: { date, words } })
  }, [])

  const startMultiLevel = useCallback((dates: string[], words: WordEntry[]) => {
    completedRef.current = null
    multiDatesRef.current = dates
    const label = dates.length === 1 ? dates[0] : `${dates[0]} 等 ${dates.length} 天`
    dispatch({ type: 'START_SESSION', payload: { date: label, words } })
  }, [])

  const answerCorrect = useCallback((wordId: string) => {
    dispatch({ type: 'ANSWER_CORRECT', payload: { wordId } })
  }, [])

  const answerWrong = useCallback(() => {
    dispatch({ type: 'ANSWER_WRONG' })
  }, [])

  const resetSession = useCallback(() => {
    completedRef.current = null
    // keep multiDatesRef intact so re-challenge marks the same dates complete
    dispatch({ type: 'RESET_SESSION' })
  }, [])

  return (
    <GameContext.Provider value={{ ...state, dispatch, startLevel, startMultiLevel, answerCorrect, answerWrong, resetSession }}>
      {children}
    </GameContext.Provider>
  )
}
