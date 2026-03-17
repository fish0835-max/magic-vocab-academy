import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from './gameReducer'
import { WordEntry, PHASE_ORDER } from '../types'

const mockWords: WordEntry[] = [
  { id: 'w1', word: 'apple',  translation: '蘋果', imageUrl: '', date: '2026-03-16' },
  { id: 'w2', word: 'banana', translation: '香蕉', imageUrl: '', date: '2026-03-16' },
  { id: 'w3', word: 'cat',    translation: '貓',   imageUrl: '', date: '2026-03-16' },
]

const startedState = () =>
  gameReducer(initialState, { type: 'START_SESSION', payload: { date: '2026-03-16', words: mockWords } })

describe('START_SESSION', () => {
  it('creates 3 phases each with shuffled words and 3 lives', () => {
    const state = startedState()
    expect(state.session).not.toBeNull()
    expect(state.session!.lives).toBe(3)
    expect(state.session!.currentPhase).toBe('spelling')
    expect(state.session!.completed).toBe(false)
    for (const phase of PHASE_ORDER) {
      expect(state.session!.phases[phase].words).toHaveLength(3)
      expect(state.session!.phases[phase].correct).toEqual([])
      expect(state.session!.phases[phase].currentIndex).toBe(0)
    }
  })

  it('each phase contains the same word IDs', () => {
    const state = startedState()
    const s = state.session!
    const ids = mockWords.map(w => w.id).sort()
    expect(s.phases.spelling.words.map(w => w.id).sort()).toEqual(ids)
    expect(s.phases.translation.words.map(w => w.id).sort()).toEqual(ids)
    expect(s.phases.cloze.words.map(w => w.id).sort()).toEqual(ids)
  })
})

describe('ANSWER_CORRECT', () => {
  it('advances index within current phase', () => {
    const state = startedState()
    const word0 = state.session!.phases.spelling.words[0]
    const next = gameReducer(state, { type: 'ANSWER_CORRECT', payload: { wordId: word0.id } })
    expect(next.session!.phases.spelling.currentIndex).toBe(1)
    expect(next.session!.phases.spelling.correct).toContain(word0.id)
    expect(next.session!.currentPhase).toBe('spelling')
  })

  it('advances to translation phase after all spelling words answered', () => {
    let state = startedState()
    for (const word of state.session!.phases.spelling.words) {
      state = gameReducer(state, { type: 'ANSWER_CORRECT', payload: { wordId: word.id } })
    }
    expect(state.session!.currentPhase).toBe('translation')
  })

  it('advances to cloze phase after all translation words answered', () => {
    let state = startedState()
    for (const phase of ['spelling', 'translation'] as const) {
      for (const word of state.session!.phases[phase].words) {
        state = gameReducer(state, { type: 'ANSWER_CORRECT', payload: { wordId: word.id } })
      }
    }
    expect(state.session!.currentPhase).toBe('cloze')
  })

  it('marks session completed when all phases done', () => {
    let state = startedState()
    for (const phase of PHASE_ORDER) {
      for (const word of state.session!.phases[phase].words) {
        state = gameReducer(state, { type: 'ANSWER_CORRECT', payload: { wordId: word.id } })
      }
    }
    expect(state.session!.completed).toBe(true)
  })
})

describe('ANSWER_WRONG', () => {
  it('decrements lives', () => {
    const state = gameReducer(startedState(), { type: 'ANSWER_WRONG' })
    expect(state.session!.lives).toBe(2)
  })

  it('sets lives to 0 on third wrong answer', () => {
    let state = startedState()
    state = gameReducer(state, { type: 'ANSWER_WRONG' })
    state = gameReducer(state, { type: 'ANSWER_WRONG' })
    state = gameReducer(state, { type: 'ANSWER_WRONG' })
    expect(state.session!.lives).toBe(0)
  })
})

describe('RESET_SESSION', () => {
  it('resets lives and all phases back to spelling', () => {
    let state = startedState()
    state = gameReducer(state, { type: 'ANSWER_WRONG' })
    state = gameReducer(state, { type: 'ANSWER_WRONG' })
    state = gameReducer(state, { type: 'RESET_SESSION' })
    expect(state.session!.lives).toBe(3)
    expect(state.session!.currentPhase).toBe('spelling')
    expect(state.session!.completed).toBe(false)
    for (const phase of PHASE_ORDER) {
      expect(state.session!.phases[phase].correct).toEqual([])
      expect(state.session!.phases[phase].currentIndex).toBe(0)
    }
  })
})

describe('COMPLETE_LEVEL', () => {
  it('adds date to completedLevels and session words to spellbook', () => {
    const state = gameReducer(startedState(), { type: 'COMPLETE_LEVEL', payload: { date: '2026-03-16' } })
    expect(state.progress.completedLevels).toContain('2026-03-16')
    for (const w of mockWords) {
      expect(state.progress.spellbook).toContain(w.id)
    }
  })

  it('does not duplicate completed levels', () => {
    let state = gameReducer(startedState(), { type: 'COMPLETE_LEVEL', payload: { date: '2026-03-16' } })
    state = gameReducer(state, { type: 'COMPLETE_LEVEL', payload: { date: '2026-03-16' } })
    expect(state.progress.completedLevels.filter(d => d === '2026-03-16')).toHaveLength(1)
  })
})

describe('AWARD_MEDAL', () => {
  it('adds week to weeklyMedals without duplicates', () => {
    let state = gameReducer(initialState, { type: 'AWARD_MEDAL', payload: { week: '2026-W11' } })
    state = gameReducer(state, { type: 'AWARD_MEDAL', payload: { week: '2026-W11' } })
    expect(state.progress.weeklyMedals.filter(w => w === '2026-W11')).toHaveLength(1)
  })
})
