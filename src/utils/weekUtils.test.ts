import { describe, it, expect } from 'vitest'
import { getISOWeek, getWeekKey, getWeekDates, formatDate } from './weekUtils'

describe('getISOWeek', () => {
  it('returns correct ISO week for known dates', () => {
    expect(getISOWeek(new Date('2026-01-01'))).toBe(1)
    expect(getISOWeek(new Date('2026-03-16'))).toBe(12) // 2026-03-16 is Mon of W12
    expect(getISOWeek(new Date('2025-12-29'))).toBe(1) // ISO week 1 of 2026
  })
})

describe('getWeekKey', () => {
  it('formats week key correctly', () => {
    expect(getWeekKey(new Date('2026-03-16'))).toBe('2026-W12') // 2026-03-16 is W12
    expect(getWeekKey(new Date('2026-01-05'))).toBe('2026-W02')
  })
})

describe('getWeekDates', () => {
  it('returns 7 dates for a week', () => {
    const dates = getWeekDates('2026-W12')
    expect(dates).toHaveLength(7)
  })

  it('starts on Monday', () => {
    const dates = getWeekDates('2026-W12')
    const monday = new Date(dates[0])
    expect(monday.getUTCDay()).toBe(1) // 1 = Monday (use UTC to avoid TZ shift)
  })

  it('returns consecutive dates', () => {
    const dates = getWeekDates('2026-W12')
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]).getTime()
      const curr = new Date(dates[i]).getTime()
      expect(curr - prev).toBe(86400000) // 1 day in ms
    }
  })
})

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-03-16'))).toBe('2026-03-16')
  })
})
