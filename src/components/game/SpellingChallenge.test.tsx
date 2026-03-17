import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellingChallenge } from './SpellingChallenge'
import { WordEntry } from '../../types'

const mockWord: WordEntry = {
  id: 'w1',
  word: 'apple',
  translation: '蘋果',
  imageUrl: '',
  date: '2026-03-16',
  sentence: 'I eat an ___ every day.',
}

describe('SpellingChallenge', () => {
  let onCorrect: ReturnType<typeof vi.fn>
  let onWrong: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onCorrect = vi.fn()
    onWrong = vi.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: vi.fn(), cancel: vi.fn() },
      writable: true,
    })
  })

  it('renders word translation and submit button', () => {
    render(<SpellingChallenge word={mockWord} onCorrect={onCorrect} onWrong={onWrong} />)
    expect(screen.getByText('蘋果')).toBeInTheDocument()
    expect(screen.getByText('施放咒語！')).toBeInTheDocument()
  })

  it('calls onWrong with incorrect input', () => {
    render(<SpellingChallenge word={mockWord} onCorrect={onCorrect} onWrong={onWrong} />)
    const input = screen.getByPlaceholderText('輸入英文單字...')
    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.click(screen.getByText('施放咒語！'))
    expect(onWrong).toHaveBeenCalledTimes(1)
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('calls onCorrect with correct input (case insensitive)', async () => {
    vi.useFakeTimers()
    render(<SpellingChallenge word={mockWord} onCorrect={onCorrect} onWrong={onWrong} />)
    const input = screen.getByPlaceholderText('輸入英文單字...')
    fireEvent.change(input, { target: { value: 'Apple' } })
    fireEvent.click(screen.getByText('施放咒語！'))
    vi.runAllTimers()
    expect(onCorrect).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('submits on Enter key', () => {
    render(<SpellingChallenge word={mockWord} onCorrect={onCorrect} onWrong={onWrong} />)
    const input = screen.getByPlaceholderText('輸入英文單字...')
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onWrong).toHaveBeenCalledTimes(1)
  })
})
