export interface WordEntry {
  id: string
  word: string
  translation: string
  imageUrl: string
  date: string           // YYYY-MM-DD
  sentence?: string      // legacy single sentence (kept for back-compat)
  sentences?: string[]   // multiple cloze sentences, each containing "___"
}

export interface PlayerProgress {
  completedLevels: string[]   // date strings
  weeklyMedals: string[]      // "2026-W11" format
  spellbook: string[]         // mastered word IDs
}

export type ChallengeType = 'spelling' | 'translation' | 'cloze'

export const PHASE_ORDER: ChallengeType[] = ['spelling', 'translation', 'cloze']

export interface PhaseState {
  words: WordEntry[]    // shuffled order for this phase
  currentIndex: number
  correct: string[]     // word IDs answered correctly in this phase
}

export interface GameSession {
  date: string
  words: WordEntry[]    // original word list
  phases: Record<ChallengeType, PhaseState>
  currentPhase: ChallengeType
  lives: number
  completed: boolean
}

export interface GameState {
  session: GameSession | null
  progress: PlayerProgress
}

export type GameAction =
  | { type: 'START_SESSION'; payload: { date: string; words: WordEntry[] } }
  | { type: 'ANSWER_CORRECT'; payload: { wordId: string } }
  | { type: 'ANSWER_WRONG' }
  | { type: 'RESET_SESSION' }
  | { type: 'COMPLETE_LEVEL'; payload: { date: string } }
  | { type: 'AWARD_MEDAL'; payload: { week: string } }
  | { type: 'LOAD_PROGRESS'; payload: PlayerProgress }
