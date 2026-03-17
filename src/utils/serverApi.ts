import { WordEntry } from '../types'

const TIMEOUT_MS = 5000

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

export async function apiVerifyPin(pin: string): Promise<boolean> {
  const res = await fetch(`/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
    signal: withTimeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.ok as boolean
}

export async function apiChangePin(newPin: string): Promise<void> {
  const res = await fetch(`/api/auth/change-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPin }),
    signal: withTimeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function apiGetWordBank(): Promise<WordEntry[]> {
  const res = await fetch(`/api/wordbank`, {
    signal: withTimeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function apiSaveWordBank(
  words: WordEntry[],
  originalIds?: string[]
): Promise<void> {
  const body: { words: WordEntry[]; originalIds?: string[] } = { words }
  if (originalIds !== undefined) body.originalIds = originalIds
  const res = await fetch(`/api/wordbank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: withTimeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function apiClearWordBank(): Promise<void> {
  const res = await fetch(`/api/wordbank`, {
    method: 'DELETE',
    signal: withTimeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function apiUploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`/api/upload/image`, {
    method: 'POST',
    body: form,
    signal: withTimeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.url as string  // relative path, e.g. /uploads/xxx.jpg
}
