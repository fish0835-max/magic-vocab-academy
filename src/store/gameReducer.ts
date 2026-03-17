import { GameState, GameAction, WordEntry, PhaseState, PHASE_ORDER } from '../types'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makePhases(words: WordEntry[]): Record<string, PhaseState> {
  return {
    spelling:    { words: shuffleArray(words), currentIndex: 0, correct: [] },
    translation: { words: shuffleArray(words), currentIndex: 0, correct: [] },
    cloze:       { words: shuffleArray(words), currentIndex: 0, correct: [] },
  }
}

export const initialState: GameState = {
  session: null,
  progress: {
    completedLevels: [],
    weeklyMedals: [],
    spellbook: [],
  },
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PROGRESS':
      return { ...state, progress: action.payload }

    case 'START_SESSION': {
      const { date, words } = action.payload
      return {
        ...state,
        session: {
          date,
          words,
          phases: makePhases(words),
          currentPhase: 'spelling',
          lives: 3,
          completed: false,
        },
      }
    }

    case 'ANSWER_CORRECT': {
      if (!state.session) return state
      const { currentPhase, phases, words } = state.session
      const phase = phases[currentPhase]
      const newCorrect = [...phase.correct, action.payload.wordId]
      const nextIndex = phase.currentIndex + 1
      const phaseDone = nextIndex >= words.length

      const updatedPhases = {
        ...phases,
        [currentPhase]: { ...phase, correct: newCorrect, currentIndex: nextIndex },
      }

      if (!phaseDone) {
        return { ...state, session: { ...state.session, phases: updatedPhases } }
      }

      // Current phase finished — advance to next or mark complete
      const phaseIdx = PHASE_ORDER.indexOf(currentPhase)
      const isLastPhase = phaseIdx === PHASE_ORDER.length - 1

      if (isLastPhase) {
        return { ...state, session: { ...state.session, phases: updatedPhases, completed: true } }
      }

      const nextPhase = PHASE_ORDER[phaseIdx + 1]
      return {
        ...state,
        session: { ...state.session, phases: updatedPhases, currentPhase: nextPhase },
      }
    }

    case 'ANSWER_WRONG': {
      if (!state.session) return state
      return {
        ...state,
        session: { ...state.session, lives: Math.max(0, state.session.lives - 1) },
      }
    }

    case 'RESET_SESSION': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          phases: makePhases(state.session.words),
          currentPhase: 'spelling',
          lives: 3,
          completed: false,
        },
      }
    }

    case 'COMPLETE_LEVEL': {
      const { date } = action.payload
      const newCompleted = state.progress.completedLevels.includes(date)
        ? state.progress.completedLevels
        : [...state.progress.completedLevels, date]
      const sessionWords = state.session?.words.map(w => w.id) ?? []
      const newSpellbook = [...new Set([...state.progress.spellbook, ...sessionWords])]
      return {
        ...state,
        progress: { ...state.progress, completedLevels: newCompleted, spellbook: newSpellbook },
      }
    }

    case 'AWARD_MEDAL': {
      const newMedals = state.progress.weeklyMedals.includes(action.payload.week)
        ? state.progress.weeklyMedals
        : [...state.progress.weeklyMedals, action.payload.week]
      return { ...state, progress: { ...state.progress, weeklyMedals: newMedals } }
    }

    default:
      return state
  }
}
