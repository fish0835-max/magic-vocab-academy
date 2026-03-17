import { WordEntry } from '../types'
import { parseCSV } from '../utils/csvParser'

export async function loadWordsFromJSON(url: string): Promise<WordEntry[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}`)
  return res.json() as Promise<WordEntry[]>
}

export async function loadWordsFromCSVText(text: string): Promise<WordEntry[]> {
  return parseCSV(text)
}

export function groupByDate(words: WordEntry[]): Record<string, WordEntry[]> {
  return words.reduce<Record<string, WordEntry[]>>((acc, w) => {
    if (!acc[w.date]) acc[w.date] = []
    acc[w.date].push(w)
    return acc
  }, {})
}
