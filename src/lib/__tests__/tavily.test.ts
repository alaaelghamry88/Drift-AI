import { describe, it, expect } from 'vitest'
import { buildSearchQueries, deduplicateByUrl, sortByRecency } from '@/lib/tavily'
import type { DriftProfile } from '@/types/profile'

const profile: DriftProfile = {
  role: 'Frontend Developer',
  stack: ['React', 'TypeScript', 'Next.js'],
  currentContext: 'Building a SaaS dashboard with real-time analytics',
  workflowAnswers: [],
  createdAt: '2026-03-22T00:00:00Z',
  updatedAt: '2026-03-22T00:00:00Z',
}

describe('buildSearchQueries', () => {
  it('returns exactly 3 queries', () => {
    expect(buildSearchQueries(profile)).toHaveLength(3)
  })

  it('first query is broad AI news', () => {
    const [q1] = buildSearchQueries(profile)
    expect(q1).toBe('AI tools and LLM news this week')
  })

  it('second query includes all stack items', () => {
    const [, q2] = buildSearchQueries(profile)
    expect(q2).toContain('React')
    expect(q2).toContain('TypeScript')
    expect(q2).toContain('Next.js')
  })

  it('third query uses a substring of currentContext', () => {
    const [, , q3] = buildSearchQueries(profile)
    // Validates the context is used — not a specific character count
    expect(q3).toContain('SaaS dashboard')
  })

  it('third query does not exceed a reasonable length', () => {
    const longProfile = { ...profile, currentContext: 'word '.repeat(50) }
    const [, , q3] = buildSearchQueries(longProfile)
    expect(q3.length).toBeLessThan(200)
  })
})

describe('deduplicateByUrl', () => {
  it('removes duplicate URLs', () => {
    const results = [
      { title: 'A', url: 'https://example.com', content: '', score: 0.9 },
      { title: 'B', url: 'https://example.com', content: '', score: 0.8 },
      { title: 'C', url: 'https://other.com', content: '', score: 0.7 },
    ]
    expect(deduplicateByUrl(results)).toHaveLength(2)
  })

  it('keeps first occurrence on duplicate URL', () => {
    const results = [
      { title: 'First', url: 'https://example.com', content: '', score: 0.9 },
      { title: 'Second', url: 'https://example.com', content: '', score: 0.8 },
    ]
    expect(deduplicateByUrl(results)[0].title).toBe('First')
  })
})

describe('sortByRecency', () => {
  it('puts dated results before undated', () => {
    const results = [
      { title: 'Undated', url: 'https://a.com', content: '', score: 0.5 },
      { title: 'Dated', url: 'https://b.com', content: '', score: 0.5, published_date: '2026-03-21' },
    ]
    expect(sortByRecency(results)[0].title).toBe('Dated')
  })

  it('sorts newer dates first', () => {
    const results = [
      { title: 'Older', url: 'https://a.com', content: '', score: 0.5, published_date: '2026-03-19' },
      { title: 'Newer', url: 'https://b.com', content: '', score: 0.5, published_date: '2026-03-21' },
    ]
    expect(sortByRecency(results)[0].title).toBe('Newer')
  })
})
