import '@testing-library/jest-dom'

// Mock Web Speech API (not available in jsdom)
class SpeechSynthesisUtteranceMock {
  text: string
  lang: string = ''
  rate: number = 1
  pitch: number = 1
  volume: number = 1
  constructor(text: string) {
    this.text = text
  }
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: SpeechSynthesisUtteranceMock,
  writable: true,
})

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
  },
  writable: true,
})
