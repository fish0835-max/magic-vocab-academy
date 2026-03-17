import { useCallback } from 'react'

function makeUtterance(text: string, rate: number, lang = 'en-US'): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  u.pitch = 1
  return u
}

/** Register onComplete with a one-shot guard + safety timeout. */
function withCompletion(
  utterance: SpeechSynthesisUtterance,
  onComplete: () => void,
  safetyMs: number,
) {
  let fired = false
  const done = () => { if (!fired) { fired = true; onComplete() } }
  utterance.onend  = done
  utterance.onerror = done
  setTimeout(done, safetyMs)
}

export function useTTS() {
  /** Speak a single word at normal speed. */
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(makeUtterance(text, 0.9))
  }, [])

  /**
   * Speak the whole sentence but slow down on the keyword.
   * Sentence must already contain the word (no "___").
   */
  const speakSentenceWithKeyword = useCallback((sentence: string, keyword: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const regex = new RegExp(`(\\b${keyword}\\b)`, 'i')
    for (const part of sentence.split(regex)) {
      if (!part) continue
      const isKey = part.toLowerCase() === keyword.toLowerCase()
      window.speechSynthesis.speak(makeUtterance(part, isKey ? 0.45 : 0.9))
    }
  }, [])

  /**
   * Cloze correct-answer sequence:
   *   Slow English → Fast English → Chinese (zh-TW)
   * `onComplete` fires after Chinese finishes (or safety timeout).
   */
  const speakClozeSequence = useCallback(
    (sentence: string, translation: string, onComplete?: () => void) => {
      if (!('speechSynthesis' in window)) { onComplete?.(); return }
      window.speechSynthesis.cancel()

      const slow = makeUtterance(sentence, 0.55)
      const fast = makeUtterance(sentence, 1.0)
      const zh   = makeUtterance(translation, 0.85, 'zh-TW')

      if (onComplete) {
        const enWords = sentence.split(/\s+/).length
        const zhLen  = translation.length
        // Estimate total queue duration:
        //   slow EN (0.55×): ~1400 ms/word
        //   fast EN (1.0×):  ~600  ms/word
        //   zh    (0.85×):  ~350  ms/char
        const safetyMs = Math.max(15000,
          enWords * 1400 +
          enWords * 600  +
          zhLen   * 350  +
          3000,
        )
        withCompletion(zh, onComplete, safetyMs)
      }

      window.speechSynthesis.speak(slow)
      window.speechSynthesis.speak(fast)
      window.speechSynthesis.speak(zh)
    },
    [],
  )

  /**
   * Speak text twice: fast (1.0×) then slow (0.55×).
   * Used by SpellingChallenge / TranslationChallenge if needed.
   */
  const speakTwice = useCallback((text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) { onComplete?.(); return }
    window.speechSynthesis.cancel()

    const fast = makeUtterance(text, 1.0)
    const slow = makeUtterance(text, 0.55)

    if (onComplete) {
      const safetyMs = Math.max(6000, text.split(/\s+/).length * 700)
      withCompletion(slow, onComplete, safetyMs)
    }

    window.speechSynthesis.speak(fast)
    window.speechSynthesis.speak(slow)
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  return { speak, speakSentenceWithKeyword, speakClozeSequence, speakTwice, stop }
}
