export function getISOWeek(date: Date): number {
  // Use UTC to avoid timezone shifts when date string is parsed as UTC midnight
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getWeekKey(date: Date): string {
  // Compute ISO year (may differ from calendar year near year boundary)
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const isoYear = d.getUTCFullYear()
  const week = getISOWeek(date)
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function getWeekDates(weekKey: string): string[] {
  const [yearStr, weekPart] = weekKey.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekPart, 10)

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7  // 1=Mon ... 7=Sun
  // Monday of week 1
  const w1Monday = new Date(jan4)
  w1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)
  // Monday of target week
  const targetMonday = new Date(w1Monday)
  targetMonday.setUTCDate(w1Monday.getUTCDate() + (week - 1) * 7)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday)
    d.setUTCDate(targetMonday.getUTCDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date())
}
