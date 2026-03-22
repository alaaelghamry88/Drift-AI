# AI News Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hallucinated digest news with real AI news fetched from Tavily, curated by the LLM through the user's role, stack, and project context.

**Architecture:** A new `src/lib/tavily.ts` module fires 3 parallel Tavily search queries built from the user's profile, deduplicates and sorts results, then passes up to 15 real articles into the LLM prompt. Both the system and user prompts are updated to restrict card types to `article`/`tool_release` when real articles are available. The LLM curates 5–7 cards from the provided list — no invention allowed.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Groq SDK (Llama 3.3 70B), Tavily Search API, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `drift-app/src/lib/tavily.ts` | Query building, Tavily HTTP calls, dedup/sort |
| Modify | `drift-app/src/lib/prompts.ts` | Both prompts accept `hasArticles` flag; `digestUserPrompt` accepts `TavilyResult[]` |
| Modify | `drift-app/src/app/api/digest/route.ts` | Calls Tavily before LLM, passes articles |
| Create | `drift-app/src/lib/__tests__/tavily.test.ts` | Unit tests for tavily.ts |
| Create | `drift-app/src/lib/__tests__/prompts.test.ts` | Unit tests for updated prompts |
| Modify | `drift-app/package.json` | Add vitest + test script |
| Create | `drift-app/vitest.config.ts` | Vitest configuration |
| Modify | `drift-app/.env.local` | Add `TAVILY_API_KEY` (never committed — already covered by `.env*` in .gitignore) |

---

## Task 1: Set up Vitest

No test runner is configured. Add Vitest before writing any tests.

**Files:**
- Modify: `drift-app/package.json`
- Create: `drift-app/vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run inside `drift-app/`:
```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Add test script to package.json**

In `drift-app/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

Create `drift-app/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

The `resolve.alias` is required — Vitest does not read `tsconfig.json` paths automatically, so the `@/` alias must be declared here explicitly or `import ... from '@/lib/...'` will fail in tests.

- [ ] **Step 4: Verify setup runs**

Run from `drift-app/`:
```bash
npm test
```
Expected: "No test files found" — no errors, no crashes.

- [ ] **Step 5: Commit**

```bash
git add drift-app/package.json drift-app/vitest.config.ts drift-app/package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Create `src/lib/tavily.ts`

Build the Tavily module — query builder, HTTP fetch with timeout, dedup and sort.

**Files:**
- Create: `drift-app/src/lib/tavily.ts`
- Create: `drift-app/src/lib/__tests__/tavily.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `drift-app/src/lib/__tests__/tavily.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd drift-app && npm test
```
Expected: FAIL — `Cannot find module '@/lib/tavily'`

- [ ] **Step 3: Create `drift-app/src/lib/tavily.ts`**

```ts
import type { DriftProfile } from '@/types/profile'

export interface TavilyResult {
  title: string
  url: string
  content: string
  published_date?: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
}

export function buildSearchQueries(profile: DriftProfile): string[] {
  const year = new Date().getFullYear()
  return [
    'AI tools and LLM news this week',
    `AI ${profile.stack.join(' ')} ${year}`,
    `AI ${profile.currentContext.slice(0, 60)} ${year}`,
  ]
}

export function deduplicateByUrl(results: TavilyResult[]): TavilyResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

export function sortByRecency(results: TavilyResult[]): TavilyResult[] {
  return [...results].sort((a, b) => {
    if (!a.published_date && !b.published_date) return 0
    if (!a.published_date) return 1
    if (!b.published_date) return -1
    return new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  })
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  if (!process.env.TAVILY_API_KEY) {
    console.error('TAVILY_API_KEY is not set — skipping Tavily search')
    return []
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 7,
        topic: 'news',
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      console.warn(`Tavily search failed for query "${query}": ${res.status}`)
      return []
    }

    const data = await res.json() as TavilyResponse
    return data.results ?? []
  } catch (err) {
    console.warn(`Tavily search error for query "${query}":`, err)
    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchAINews(profile: DriftProfile): Promise<TavilyResult[]> {
  const queries = buildSearchQueries(profile)
  const settled = await Promise.allSettled(queries.map(searchTavily))
  const all = settled
    .filter((r): r is PromiseFulfilledResult<TavilyResult[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
  const unique = deduplicateByUrl(all)
  const sorted = sortByRecency(unique)
  return sorted.slice(0, 15)
}
```

Note: `Promise.allSettled` is used instead of `Promise.all` so a single slow or failing query doesn't block the other two — results from fast queries are still returned even if one times out.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd drift-app && npm test
```
Expected: All tests in `tavily.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add drift-app/src/lib/tavily.ts drift-app/src/lib/__tests__/tavily.test.ts
git commit -m "feat: add Tavily news fetcher with query builder and dedup"
```

---

## Task 3: Update prompts in `src/lib/prompts.ts`

Update both `digestSystemPrompt` and `digestUserPrompt` — both need to restrict card types when real articles are available. Restricting only the user prompt is insufficient because the system prompt defines the card schema the LLM defaults to.

**Files:**
- Modify: `drift-app/src/lib/prompts.ts`
- Create: `drift-app/src/lib/__tests__/prompts.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `drift-app/src/lib/__tests__/prompts.test.ts`:
```ts
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
    // System prompt schema should only show article and tool_release
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd drift-app && npm test
```
Expected: FAIL — `digestSystemPrompt` and `digestUserPrompt` signature mismatches.

- [ ] **Step 3: Update `drift-app/src/lib/prompts.ts`**

Add this import at the very top of the file:
```ts
import type { TavilyResult } from '@/lib/tavily'
```

Replace the existing `digestSystemPrompt` function (lines 13–42) with:
```ts
export function digestSystemPrompt(profile: DriftProfile, hasArticles = false): string {
  const cardTypes = hasArticles
    ? '"tool_release" | "article"'
    : '"tool_release" | "article" | "video" | "repo" | "skill"'

  const metadataSection = hasArticles
    ? `Metadata fields by card_type:
- tool_release: { type: "tool_release", tool_name, version_from?, version_to?, impact: "high"|"medium"|"low", source }
- article: { type: "article", read_time_minutes, source, author?, key_takeaway }`
    : `Metadata fields by card_type:
- tool_release: { type: "tool_release", tool_name, version_from?, version_to?, impact: "high"|"medium"|"low", source }
- article: { type: "article", read_time_minutes, source, author?, key_takeaway }
- video: { type: "video", platform, channel, duration_minutes?, topic_tags, key_timestamps? }
- repo: { type: "repo", github_url, stars?, language?, use_case }
- skill: { type: "skill", why_now, learning_path? }`

  return `You are Drift — a calm, intelligent AI assistant for developers navigating the AI era.

Your job is to curate a daily digest of maximum 5–7 items that are genuinely relevant to this specific developer.

${buildProfileContext(profile)}

You are opinionated and direct. You filter ruthlessly — surface only what actually matters for this person's stack and current work.

When generating the digest, return a valid JSON array of card objects. Each card must have this shape:
{
  "id": "unique string",
  "card_type": ${cardTypes},
  "title": "string",
  "summary": "2-3 sentence summary",
  "relevance_score": number (1-10),
  "relevance_reason": "1 sentence explaining why this is relevant to this user specifically",
  "source_url": "string (optional)",
  "metadata": { ...type-specific fields }
}

${metadataSection}

Return ONLY the JSON array, no other text.`
}
```

Replace the existing `digestUserPrompt` function (lines 44–52) with:
```ts
export function digestUserPrompt(profile: DriftProfile, articles: TavilyResult[]): string {
  if (articles.length > 0) {
    const articleList = articles
      .map((a, i) => `[${i + 1}] ${a.title} | ${a.url} | ${a.content}`)
      .join('\n')

    return `Generate today's digest for a ${profile.role} working on: "${profile.currentContext}".

Select 5–7 items from the articles provided below. Only use articles from this list — do not invent titles or URLs not present here. Set source_url to the article's URL.

Prioritise items most relevant to their stack: ${profile.stack.join(', ')}.

ARTICLES:
${articleList}

Return 5–7 items as a JSON array.`
  }

  return `Generate today's digest for a ${profile.role} working on: "${profile.currentContext}".

Use web search to find current AI/developer news, tool releases, and relevant content from the last 7 days.

Focus on items directly relevant to their stack: ${profile.stack.join(', ')}.

Return 5–7 items as a JSON array.`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd drift-app && npm test
```
Expected: All tests in both `tavily.test.ts` and `prompts.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add drift-app/src/lib/prompts.ts drift-app/src/lib/__tests__/prompts.test.ts
git commit -m "feat: update digest prompts to restrict card types when real articles available"
```

---

## Task 4: Update `src/app/api/digest/route.ts`

Wire Tavily into the route — fetch before LLM, pass articles through, handle fallback.

**Files:**
- Modify: `drift-app/src/app/api/digest/route.ts`

No new tests needed — the route is an integration point; the units (`tavily.ts`, `prompts.ts`) are already tested.

- [ ] **Step 1: Update the route**

Replace the entire contents of `drift-app/src/app/api/digest/route.ts` with:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { digestSystemPrompt, digestUserPrompt } from '@/lib/prompts'
import { fetchAINews } from '@/lib/tavily'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard } from '@/types/digest'

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json() as { profile: DriftProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile required' }, { status: 400 })
    }

    const articles = await fetchAINews(profile)
    const hasArticles = articles.length > 0

    if (!hasArticles) {
      console.warn('Tavily returned no results — falling back to LLM-only digest')
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 8096,
      messages: [
        { role: 'system', content: digestSystemPrompt(profile, hasArticles) },
        { role: 'user', content: digestUserPrompt(profile, articles) }
      ],
    })

    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No text response')

    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/(\[[\s\S]*\])/)

    if (!jsonMatch) throw new Error('No JSON array found in response')

    const cards: DigestCard[] = JSON.parse(jsonMatch[1] || jsonMatch[0])

    const cardsWithIds = cards.map((card, i) => ({
      ...card,
      id: card.id || `card-${Date.now()}-${i}`
    }))

    return NextResponse.json({
      cards: cardsWithIds,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Digest generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Run all tests to confirm nothing is broken**

```bash
cd drift-app && npm test
```
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add drift-app/src/app/api/digest/route.ts
git commit -m "feat: wire Tavily news fetching into digest route"
```

---

## Task 5: Add API key and smoke test

- [ ] **Step 1: Confirm `.env.local` is gitignored**

`drift-app/.gitignore` line 34 contains `.env*` — this covers `.env.local`. Safe to proceed.

- [ ] **Step 2: Add the Tavily API key**

Add to `drift-app/.env.local` (create if it doesn't exist):
```
TAVILY_API_KEY=tvly-YOUR_KEY_HERE
```

Get your key at https://app.tavily.com → API Keys. Free tier: 1000 searches/month (~333 digest refreshes at 3 searches each).

- [ ] **Step 3: Start the dev server and test**

```bash
cd drift-app && npm run dev
```

Open the app, navigate to the digest view, and trigger a refresh. Expected:
- Cards appear with real article titles published recently
- `source_url` links open correctly in the browser
- Cards are `article` or `tool_release` type only
- No obviously hallucinated or dated content

- [ ] **Step 4: Check the server logs**

In the terminal running `npm run dev`, confirm:
- No `TAVILY_API_KEY is not set` errors
- No `Tavily search failed` or `Tavily search error` warnings
- No `Tavily returned no results` fallback warning
- Digest generates successfully

- [ ] **Step 5: Clear cached digest and retest**

If the browser is showing a cached digest, open the browser console and run:
```js
localStorage.removeItem('drift_digest')
localStorage.removeItem('drift_digest_date')
location.reload()
```
Then verify new cards load with real, recent articles.

---

## Done

All digest cards are now backed by real Tavily-fetched AI news articles. URLs are real and functional. The LLM curates and formats — it no longer hallucinates. Fallback to LLM-only is automatic if Tavily is unavailable.
