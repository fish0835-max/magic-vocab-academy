import { WordEntry } from '../types'

export function parseCSV(text: string): WordEntry[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const required = ['id', 'word', 'translation', 'imageurl', 'date']
  const missing = required.filter(r => !headers.includes(r))
  if (missing.length > 0) {
    throw new Error(`CSV missing columns: ${missing.join(', ')}`)
  }

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? '' })
    return {
      id: row['id'],
      word: row['word'],
      translation: row['translation'],
      imageUrl: row['imageurl'],
      date: row['date'],
      sentence: row['sentence'] || undefined,
    } as WordEntry
  }).filter(w => w.id && w.word)
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
