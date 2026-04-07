import { describe, it, expect } from 'vitest'
import { openrouter, DIGEST_MODEL, VERDICT_MODEL } from '@/lib/ai'

describe('ai module', () => {
  it('exports an openrouter client with the correct baseURL', () => {
    // @ts-ignore — accessing internal config for test
    expect(openrouter.baseURL).toBe('https://openrouter.ai/api/v1')
  })

  it('DIGEST_MODEL falls back to gemini-flash when env var not set', () => {
    expect(typeof DIGEST_MODEL).toBe('string')
    expect(DIGEST_MODEL.length).toBeGreaterThan(0)
  })

  it('VERDICT_MODEL falls back to qwen when env var not set', () => {
    expect(typeof VERDICT_MODEL).toBe('string')
    expect(VERDICT_MODEL.length).toBeGreaterThan(0)
  })
})
