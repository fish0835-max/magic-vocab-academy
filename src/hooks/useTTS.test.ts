import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTTS } from './useTTS'

describe('useTTS', () => {
  let mockSpeak: ReturnType<typeof vi.fn>
  let mockCancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSpeak = vi.fn()
    mockCancel = vi.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: mockSpeak, cancel: mockCancel },
      writable: true,
    })
  })

  describe('speak', () => {
    it('calls speechSynthesis.speak with en-US', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speak('apple') })
      expect(mockSpeak).toHaveBeenCalledTimes(1)
      const u = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance
      expect(u.lang).toBe('en-US')
      expect(u.text).toBe('apple')
    })

    it('cancels previous speech before speaking', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speak('apple') })
      expect(mockCancel).toHaveBeenCalled()
    })
  })

  describe('speakTwice', () => {
    it('queues two utterances with fast then slow rate', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speakTwice('The cat is here.') })
      expect(mockSpeak).toHaveBeenCalledTimes(2)
      const u1 = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance
      const u2 = mockSpeak.mock.calls[1][0] as SpeechSynthesisUtterance
      expect(u1.rate).toBeGreaterThan(u2.rate)
      expect(u1.text).toBe('The cat is here.')
      expect(u2.text).toBe('The cat is here.')
    })

    it('fires onComplete callback via safety timeout when onend is unavailable', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useTTS())
      const onComplete = vi.fn()
      act(() => { result.current.speakTwice('Hello world.', onComplete) })
      // callback should NOT fire immediately
      expect(onComplete).not.toHaveBeenCalled()
      // safety timeout fires after enough time
      act(() => { vi.runAllTimers() })
      expect(onComplete).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })

    it('onComplete fires only once even if both onend and timeout trigger', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useTTS())
      const onComplete = vi.fn()
      let capturedUtterance: SpeechSynthesisUtterance | null = null

      mockSpeak.mockImplementation((u: SpeechSynthesisUtterance) => {
        capturedUtterance = u  // capture the last (slow) utterance
      })

      act(() => { result.current.speakTwice('Hello world.', onComplete) })

      // Simulate onend firing
      act(() => { capturedUtterance?.onend?.(new Event('end') as SpeechSynthesisEvent) })
      // Then safety timeout fires too
      act(() => { vi.runAllTimers() })

      expect(onComplete).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })
  })

  describe('speakSentenceWithKeyword', () => {
    it('slows down the keyword utterance relative to surrounding text', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speakSentenceWithKeyword('I eat an apple every day.', 'apple') })
      expect(mockSpeak.mock.calls.length).toBeGreaterThanOrEqual(2)
      const calls = mockSpeak.mock.calls.map(c => c[0] as SpeechSynthesisUtterance)
      const keywordU = calls.find(u => u.text.toLowerCase() === 'apple')
      const normalU  = calls.find(u => !u.text.toLowerCase().includes('apple'))
      expect(keywordU).toBeDefined()
      expect(normalU).toBeDefined()
      expect(keywordU!.rate).toBeLessThan(normalU!.rate)
    })

    it('uses en-US for all utterances', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speakSentenceWithKeyword('The dog runs fast.', 'dog') })
      for (const call of mockSpeak.mock.calls) {
        expect((call[0] as SpeechSynthesisUtterance).lang).toBe('en-US')
      }
    })
  })

  describe('speakClozeSequence', () => {
    it('queues three utterances: slow EN, fast EN, zh-TW', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.speakClozeSequence('The cat is here.', '貓在這裡') })
      expect(mockSpeak).toHaveBeenCalledTimes(3)
      const [u1, u2, u3] = mockSpeak.mock.calls.map(c => c[0] as SpeechSynthesisUtterance)
      // slow EN
      expect(u1.lang).toBe('en-US')
      expect(u1.rate).toBeLessThan(u2.rate)
      // fast EN
      expect(u2.lang).toBe('en-US')
      expect(u2.text).toBe('The cat is here.')
      // Chinese
      expect(u3.lang).toBe('zh-TW')
      expect(u3.text).toBe('貓在這裡')
    })

    it('onComplete fires once after zh-TW utterance (safety timeout)', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useTTS())
      const onComplete = vi.fn()
      act(() => { result.current.speakClozeSequence('Hello world.', '你好世界', onComplete) })
      expect(onComplete).not.toHaveBeenCalled()
      act(() => { vi.runAllTimers() })
      expect(onComplete).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })
  })

  describe('stop', () => {
    it('cancels speechSynthesis', () => {
      const { result } = renderHook(() => useTTS())
      act(() => { result.current.stop() })
      expect(mockCancel).toHaveBeenCalled()
    })
  })
})
