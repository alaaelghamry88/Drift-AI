// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- helpers to test (mirrors implementations in ask/page.tsx) ---
const HISTORY_KEY = 'drift_ask_history'
const MAX_HISTORY = 50

function loadHistory(): unknown[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as unknown[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: unknown[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {
    // storage unavailable
  }
}
// ---

describe('loadHistory', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty array when nothing is stored', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns parsed array from localStorage', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ id: '1' }]))
    expect(loadHistory()).toEqual([{ id: '1' }])
  })

  it('returns empty array on invalid JSON', () => {
    localStorage.setItem(HISTORY_KEY, 'not-json{{{')
    expect(loadHistory()).toEqual([])
  })
})

describe('saveHistory', () => {
  beforeEach(() => localStorage.clear())

  it('saves items to localStorage', () => {
    saveHistory([{ id: '1' }, { id: '2' }])
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual([{ id: '1' }, { id: '2' }])
  })

  it('trims to MAX_HISTORY items', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: String(i) }))
    saveHistory(items)
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toHaveLength(50)
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)[0]).toEqual({ id: '0' })
  })

  it('silently ignores localStorage errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded') })
    expect(() => saveHistory([{ id: '1' }])).not.toThrow()
    vi.restoreAllMocks()
  })
})
