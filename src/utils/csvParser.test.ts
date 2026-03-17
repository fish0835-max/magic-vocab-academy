import { describe, it, expect } from 'vitest'
import { parseCSV } from './csvParser'

const VALID_CSV = `id,word,translation,imageurl,date,sentence
w001,apple,蘋果,https://example.com/apple.jpg,2026-03-16,I eat an ___ every day.
w002,banana,香蕉,https://example.com/banana.jpg,2026-03-16,The ___ is yellow.`

describe('parseCSV', () => {
  it('parses valid CSV correctly', () => {
    const result = parseCSV(VALID_CSV)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'w001',
      word: 'apple',
      translation: '蘋果',
      imageUrl: 'https://example.com/apple.jpg',
      date: '2026-03-16',
      sentence: 'I eat an ___ every day.',
    })
  })

  it('filters out rows with missing id or word', () => {
    const csv = `id,word,translation,imageurl,date
,apple,蘋果,url,2026-03-16
w002,,香蕉,url,2026-03-16
w003,cat,貓,url,2026-03-16`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('w003')
  })

  it('throws on missing required columns', () => {
    const csv = `word,translation\napple,蘋果`
    expect(() => parseCSV(csv)).toThrow('CSV missing columns')
  })

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([])
    expect(parseCSV('id,word,translation,imageurl,date')).toEqual([])
  })

  it('handles quoted fields with commas', () => {
    const csv = `id,word,translation,imageurl,date,sentence
w001,apple,蘋果,https://example.com/apple.jpg,2026-03-16,"I eat an ___, every day."`
    const result = parseCSV(csv)
    expect(result[0].sentence).toBe('I eat an ___, every day.')
  })
})
