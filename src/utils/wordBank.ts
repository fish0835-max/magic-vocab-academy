import { WordEntry } from '../types'

const WORDBANK_KEY = 'englishcard_wordbank'

export function loadWordBank(): WordEntry[] {
  try {
    const raw = localStorage.getItem(WORDBANK_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WordEntry[]
  } catch {
    return []
  }
}

/** Upsert words by ID — new entries with the same ID overwrite old ones. */
export function saveToWordBank(incoming: WordEntry[]): void {
  const existing = loadWordBank()
  const map = new Map(existing.map(w => [w.id, w]))
  for (const w of incoming) {
    if (w.word.trim()) map.set(w.id, w)
  }
  localStorage.setItem(WORDBANK_KEY, JSON.stringify([...map.values()]))
}

/**
 * Edit-session save: remove the original set of words (by ID) then add
 * the new words. This correctly handles deletions made in the editor.
 */
export function replaceWordsByIds(originalIds: Set<string>, newWords: WordEntry[]): void {
  const existing = loadWordBank()
  const kept    = existing.filter(w => !originalIds.has(w.id))
  const valid   = newWords.filter(w => w.word?.trim())
  localStorage.setItem(WORDBANK_KEY, JSON.stringify([...kept, ...valid]))
}

export function clearWordBank(): void {
  localStorage.removeItem(WORDBANK_KEY)
}
