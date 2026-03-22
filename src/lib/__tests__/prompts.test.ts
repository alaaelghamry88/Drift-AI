import { describe, it, expect } from 'vitest'
import { digestSystemPrompt, digestUserPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'
import type { TavilyResult } from '@/lib/tavily'

const profile: DriftProfile = {
  role: 'Frontend Developer',
  stack: ['React', 'TypeScript'],
  currentContext: 'Building a SaaS dashboard',
  workflowAnswers: [],
  createdAt: '2026-03-22T00:00:00Z',
  updatedAt: '2026-03-22T00:00:00Z',
}

const articles: TavilyResult[] = [
  { title: 'GPT-5 Released', url: 'https://openai.com/gpt5', content: 'OpenAI releases GPT-5.', score: 0.95 },
  { title: 'React AI Hooks', url: 'https://react.dev/ai-hooks', content: 'New hooks for AI in React.', score: 0.88 },
]

describe('digestSystemPrompt with articles', () => {
  it('does not list video as an allowed card_type', () => {
    const prompt = digestSystemPrompt(profile, true)
    expect(prompt).not.toContain('"video"')
  })

  it('does not list repo as an allowed card_type', () => {
    const prompt = digestSystemPrompt(profile, true)
    expect(prompt).not.toContain('"repo"')
  })
})

describe('digestSystemPrompt without articles (fallback)', () => {
  it('includes all card types', () => {
    const prompt = digestSystemPrompt(profile, false)
    expect(prompt).toContain('"video"')
    expect(prompt).toContain('"repo"')
  })
})

describe('digestUserPrompt with articles', () => {
  it('includes article titles in the prompt', () => {
    const prompt = digestUserPrompt(profile, articles)
    expect(prompt).toContain('GPT-5 Released')
    expect(prompt).toContain('React AI Hooks')
  })

  it('includes article URLs in the prompt', () => {
    const prompt = digestUserPrompt(profile, articles)
    expect(prompt).toContain('https://openai.com/gpt5')
    expect(prompt).toContain('https://react.dev/ai-hooks')
  })

  it('instructs LLM not to invent articles', () => {
    const prompt = digestUserPrompt(profile, articles)
    expect(prompt.toLowerCase()).toContain('do not invent')
  })
})

describe('digestUserPrompt without articles (fallback)', () => {
  it('does not instruct LLM to avoid inventing', () => {
    const prompt = digestUserPrompt(profile, [])
    expect(prompt.toLowerCase()).not.toContain('do not invent')
  })

  it('includes the user role and context', () => {
    const prompt = digestUserPrompt(profile, [])
    expect(prompt).toContain('Frontend Developer')
    expect(prompt).toContain('Building a SaaS dashboard')
  })
})
