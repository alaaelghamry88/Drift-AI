# Phase 4 — Link Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Link Drop feature — users paste any URL to get a streamed AI assessment; all assessments are persisted as a history feed on `/drop`; saved items surface in the digest.

**Architecture:** A server-side URL fetch + HTML-strip utility feeds content to the existing Groq streaming route. The `useStreaming` hook gains an `onDone` callback and a `[DONE]` outer-loop fix. A new `/drop` page owns the input bar, streaming card, and `VerdictCard` history list — all backed by `localStorage`. The DigestScreen gains a persistent `LinkDropInput` and a collapsible saved links section.

**Tech Stack:** Next.js 14 App Router, TypeScript, Groq SDK, Framer Motion, Tailwind CSS, Vitest, localStorage

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/html-strip.ts` | Create | Pure string transformer: strips HTML tags/script/style blocks, collapses whitespace, truncates to 3000 chars. Does NOT fetch URLs — that lives in the API route. |
| `src/lib/__tests__/html-strip.test.ts` | Create | Vitest unit tests for html-strip |
| `src/types/verdict.ts` | Modify | Add `StoredLinkAssessment` extending `LinkAssessment` with `assessedAt` |
| `src/hooks/use-streaming.ts` | Modify | Fix `[DONE]` outer loop; add `onDone` + `parsed.error` handling |
| `src/app/api/link-drop/route.ts` | Modify | Server-side URL fetch using html-strip before streaming |
| `src/components/digest/digest-screen.tsx` | Modify | Add `LinkDropInput` above cards; add collapsible saved links section |
| `src/app/(app)/drop/page.tsx` | Create | Full drop page: input bar, streaming card, VerdictCard list |

---

## Task 1: Extract HTML stripping utility

**Files:**
- Create: `src/lib/html-strip.ts`
- Create: `src/lib/__tests__/html-strip.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/html-strip.test.ts
import { describe, it, expect } from 'vitest'
import { stripHtml } from '@/lib/html-strip'

describe('stripHtml', () => {
  it('removes script blocks including their content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>'
    expect(stripHtml(html)).toBe('Hello')
  })

  it('removes style blocks including their content', () => {
    const html = '<p>Hello</p><style>.foo { color: red }</style>'
    expect(stripHtml(html)).toBe('Hello')
  })

  it('removes remaining HTML tags', () => {
    const html = '<h1>Title</h1><p>Body text here.</p>'
    expect(stripHtml(html)).toBe('Title Body text here.')
  })

  it('collapses multiple whitespace into single spaces', () => {
    const html = '<p>Hello   world</p>\n\n<p>Foo</p>'
    expect(stripHtml(html)).toBe('Hello world Foo')
  })

  it('truncates to 3000 characters', () => {
    const html = '<p>' + 'a'.repeat(4000) + '</p>'
    expect(stripHtml(html).length).toBe(3000)
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/html-strip.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/html-strip'`

- [ ] **Step 3: Implement `stripHtml`**

```ts
// src/lib/html-strip.ts
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/html-strip.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/html-strip.ts src/lib/__tests__/html-strip.test.ts
git commit -m "feat: add stripHtml utility with tests"
```

---

## Task 2: Add `StoredLinkAssessment` type

**Files:**
- Modify: `src/types/verdict.ts`

- [ ] **Step 1: Add the type**

Open `src/types/verdict.ts`. After the `LinkAssessment` interface, add:

```ts
export interface StoredLinkAssessment extends LinkAssessment {
  assessedAt: string // ISO date string — set client-side at persist time
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/verdict.ts
git commit -m "feat: add StoredLinkAssessment type"
```

---

## Task 3: Fix `useStreaming` hook

**Files:**
- Modify: `src/hooks/use-streaming.ts`

**What changes and why:**
- **[DONE] loop fix:** The current `break` on `[DONE]` only exits the inner `for...of lines` loop. The outer `while(true)` keeps iterating, hanging `isStreaming`. Fix: introduce `let streamDone = false` before the reader loop; change `while (true)` to `while (!streamDone)`; inside the inner loop, when `[DONE]` is seen, set `streamDone = true` and `break`. The outer while condition is then false on the next iteration and exits cleanly.
- **`options?: StreamOptions`** — second parameter is optional. Existing callers (`handleGoDeeper` in `DigestCardItem`) pass no second argument and are fully unaffected by this change.
- **`parsed.error` handling** — add SSE error event support so error state is set even after streaming starts.

- [ ] **Step 1: Rewrite `use-streaming.ts`**

Replace the entire file content:

```ts
'use client'

import { useState, useCallback } from 'react'

interface StreamOptions {
  onDone?: (data: unknown) => void
}

export function useStreaming() {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stream = useCallback(async (
    fetchFn: () => Promise<Response>,
    options?: StreamOptions
  ): Promise<string> => {
    setText('')
    setError(null)
    setIsStreaming(true)
    let accumulated = ''

    try {
      const response = await fetchFn()
      if (!response.ok) throw new Error('Stream request failed')
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') {
            streamDone = true
            break
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              setError(parsed.error)
              streamDone = true
              break
            }
            if (parsed.done && parsed.assessment) {
              options?.onDone?.(parsed.assessment)
              continue
            }
            if (parsed.text) {
              accumulated += parsed.text
              setText(prev => prev + parsed.text)
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed')
    } finally {
      setIsStreaming(false)
    }
    return accumulated
  }, [])

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setIsStreaming(false)
  }, [])

  return { text, isStreaming, error, stream, reset }
}
```

- [ ] **Step 2: Verify existing digest streaming is unaffected**

Open `src/components/digest/digest-screen.tsx` and find the `stream()` call inside `handleGoDeeper` (around line 118). It currently reads:
```ts
const result = await stream(() => fetch('/api/deeper', { ... }))
```
This passes no second argument — TypeScript must accept it as valid with the new optional `options?` parameter. Confirm no red squiggles on that line.

- [ ] **Step 3: Verify TypeScript compiles and all existing tests still pass**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: no TS errors, all existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-streaming.ts
git commit -m "fix: correct useStreaming [DONE] loop exit; add onDone and error SSE handling"
```

---

## Task 4: Update `/api/link-drop` route to fetch URL content

**Files:**
- Modify: `src/app/api/link-drop/route.ts`

**What changes:** Before calling Groq, fetch the URL server-side with a 5s timeout, run `stripHtml`, and append the extracted content to the user message. On any failure, append a fallback note instead.

- [ ] **Step 1: Rewrite the route**

```ts
// src/app/api/link-drop/route.ts
import { NextRequest } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { linkAssessmentSystemPrompt } from '@/lib/prompts'
import { stripHtml } from '@/lib/html-strip'
import type { DriftProfile } from '@/types/profile'

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return '(Content could not be retrieved.)'
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 0 ? text : '(Content could not be retrieved.)'
  } catch {
    return '(Content could not be retrieved.)'
  }
}

export async function POST(req: NextRequest) {
  const { profile, url } = await req.json() as { profile: DriftProfile; url: string }

  const content = await fetchPageContent(url)
  const userMessage = content === '(Content could not be retrieved.)'
    ? `Assess this URL for me: ${url}\n\n(Content could not be retrieved.)`
    : `Assess this URL for me: ${url}\n\nCONTENT:\n${content}`

  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: linkAssessmentSystemPrompt(profile) },
      { role: 'user', content: userMessage }
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  let buffer = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            buffer += text
            const data = JSON.stringify({ text, partial: true })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        try {
          const jsonMatch = buffer.match(/```json\n?([\s\S]*?)\n?```/) ||
                            buffer.match(/(\{[\s\S]*\})/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
            const doneData = JSON.stringify({ done: true, assessment: parsed })
            controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          }
        } catch {
          // couldn't parse JSON, send raw
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const errData = JSON.stringify({ error: String(err) })
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/link-drop/route.ts
git commit -m "feat: fetch URL content server-side before link assessment"
```

---

## Task 5: Add `LinkDropInput` and saved links to `DigestScreen`

**Files:**
- Modify: `src/components/digest/digest-screen.tsx`

**What changes:**
1. Render `<LinkDropInput profile={profile} />` between the header divider and the card list.
2. Read `drift_drop_history` from localStorage on mount and on window focus. Filter to `save_to_digest === true` items. Render a collapsible "Saved Links" section above the cards.

- [ ] **Step 1: Add imports**

In `digest-screen.tsx`:

1. Find the React import line (currently `import { useState, useCallback } from 'react'`) and add `useEffect`:
```ts
import { useState, useCallback, useEffect } from 'react'
```

2. Add these new imports after the existing imports:
```ts
import { LinkDropInput } from '@/components/ui/link-drop'
import type { StoredLinkAssessment } from '@/types/verdict'
```

`ChevronDown` and `ExternalLink` are already imported from lucide-react — do not duplicate them.

- [ ] **Step 2: Add state and effect for saved links**

Inside `DigestScreen`, after the existing `useState` declarations, add:

```ts
const [savedLinks, setSavedLinks] = useState<StoredLinkAssessment[]>([])
const [savedLinksOpen, setSavedLinksOpen] = useState(true)

useEffect(() => {
  const read = () => {
    try {
      const raw = localStorage.getItem('drift_drop_history')
      const all: StoredLinkAssessment[] = raw ? JSON.parse(raw) : []
      setSavedLinks(all.filter(item => item.save_to_digest))
    } catch {
      // localStorage unavailable
    }
  }
  read()
  window.addEventListener('focus', read)
  return () => window.removeEventListener('focus', read)
}, [])
```

- [ ] **Step 3: Add `LinkDropInput` and saved links JSX**

**`LinkDropInput` placement — always visible, even in done state.**

The header block is wrapped in `{!isDone && (...)}`. Do NOT place `LinkDropInput` inside that block — it would disappear when the user finishes their digest. Instead, place it between the header block and the loading skeletons, as a sibling element at the top level of the `<div className="space-y-6">` wrapper.

Find the closing `{/* Header */}` block (ends with `</div>`), then add immediately after it (as a sibling, not nested inside):

```tsx
{/* Persistent link drop input */}
<LinkDropInput profile={profile} />
```

Then, just before the `{/* Loading skeletons */}` comment, add the saved links section:

```tsx
{/* Saved Links */}
{savedLinks.length > 0 && (
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
    <button
      onClick={() => setSavedLinksOpen(prev => !prev)}
      className="w-full flex items-center justify-between px-4 py-3 text-left"
    >
      <span className="text-label text-drift-text-tertiary tracking-[0.08em]">Saved Links</span>
      <ChevronDown className={cn(
        'w-4 h-4 text-drift-text-tertiary transition-transform duration-200',
        savedLinksOpen && 'rotate-180'
      )} />
    </button>
    <AnimatePresence>
      {savedLinksOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
            {savedLinks.map(item => (
              <div key={item.assessedAt} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-body-sm text-drift-text-secondary flex-1 truncate">
                  {item.title}
                </span>
                <span className={cn(
                  'text-label px-2 py-0.5 rounded-md border shrink-0',
                  item.verdict === 'worth_your_time' && 'text-drift-accent bg-drift-accent/10 border-drift-accent/25',
                  item.verdict === 'save_for_later' && 'text-amber-400 bg-amber-400/10 border-amber-400/25',
                  item.verdict === 'skip' && 'text-white/40 bg-white/[0.04] border-white/[0.07]',
                )}>
                  {item.verdict === 'worth_your_time' ? 'Worth it' : item.verdict === 'save_for_later' ? 'Save' : 'Skip'}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-drift-text-tertiary hover:text-drift-text-secondary transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Smoke-test visually**

Run `npm run dev`, navigate to `/`, check:
- Link drop input appears below the header divider
- Submitting a URL navigates to `/drop?url=...` (404 is fine — drop page not built yet)
- Saved links section only appears if `drift_drop_history` has items with `save_to_digest: true`

- [ ] **Step 6: Commit**

```bash
git add src/components/digest/digest-screen.tsx
git commit -m "feat: add LinkDropInput and saved links section to DigestScreen"
```

---

## Task 6: Create the `/drop` page

**Files:**
- Create: `src/app/(app)/drop/page.tsx`

This is the largest task. Build it top-down: types/state → input bar → streaming card → VerdictCard → history list → empty state → auto-trigger.

- [ ] **Step 1: Create the file with the page shell**

**Important:** `export const dynamic = 'force-dynamic'` is required. In Next.js 14 App Router, calling `useSearchParams()` in a Client Component triggers a build-time error unless the page opts out of static rendering. This directive satisfies that requirement without adding a `<Suspense>` wrapper. It must appear before the imports — Next.js treats it as a route segment config.

```tsx
// src/app/(app)/drop/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight, ExternalLink, Bookmark, RefreshCw } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { useStreaming } from '@/hooks/use-streaming'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { cn } from '@/lib/utils'
import type { LinkAssessment, StoredLinkAssessment } from '@/types/verdict'

const HISTORY_KEY = 'drift_drop_history'
const MAX_HISTORY = 50

function loadHistory(): StoredLinkAssessment[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as StoredLinkAssessment[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: StoredLinkAssessment[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {
    // localStorage unavailable
  }
}

export default function DropPage() {
  return <DropPageContent />
}
```

- [ ] **Step 2: Add `DropPageContent` with state and assessment logic**

**Save toggle persistence:** `VerdictCard` uses local state for the save button, but persisting toggled state requires the page-level `handleToggleSave` to update both React state and localStorage. The `VerdictCard` calls `onToggleSave(item.url)`, and `handleToggleSave` in `DropPageContent` maps over the history, flips `save_to_digest` on the matching item (by `url`), and calls `saveHistory`. This way the toggle survives a page reload.

Append to `drop/page.tsx`:

```tsx
const VERDICT_CONFIG = {
  worth_your_time: {
    label: 'Worth Your Time',
    className: 'text-drift-accent bg-drift-accent/10 border-drift-accent/25',
    accent: 'bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent',
  },
  save_for_later: {
    label: 'Save For Later',
    className: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    accent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
  },
  skip: {
    label: 'Skip',
    className: 'text-white/40 bg-white/[0.04] border-white/[0.07]',
    accent: 'bg-gradient-to-r from-white/20 via-white/5 to-transparent',
  },
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  article: 'Article',
  repo: 'Repo',
  post: 'Post',
  other: 'Link',
}

function DropPageContent() {
  const { profile } = useProfile()
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('url') ?? ''

  const [inputValue, setInputValue] = useState(urlParam)
  const [inputError, setInputError] = useState('')
  const [history, setHistory] = useState<StoredLinkAssessment[]>(() => loadHistory())
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  const { text: streamText, isStreaming, error: streamError, stream, reset } = useStreaming()
  const hasTriggered = useRef(false)

  const triggerAssessment = useCallback(async (url: string) => {
    if (!profile) return
    setPendingUrl(url)
    reset()

    const result = await stream(
      () => fetch('/api/link-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, url }),
      }),
      {
        onDone: (data) => {
          const assessment = data as LinkAssessment
          const stored: StoredLinkAssessment = { ...assessment, url, assessedAt: new Date().toISOString() }
          setHistory(prev => {
            const next = [stored, ...prev].slice(0, MAX_HISTORY)
            saveHistory(next)
            return next
          })
          setPendingUrl(null)
          setInputValue('')
        },
      }
    )

    // If streaming finished but onDone never fired (no JSON found), clear pending
    if (result !== undefined) setPendingUrl(null)
  }, [profile, stream, reset])

  // Auto-trigger from ?url= param
  useEffect(() => {
    if (urlParam && !hasTriggered.current) {
      hasTriggered.current = true
      triggerAssessment(urlParam)
    }
  }, [urlParam, triggerAssessment])

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
    } catch {
      setInputError('Please enter a valid URL (e.g. https://example.com)')
      return
    }
    setInputError('')
    triggerAssessment(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const handleToggleSave = (url: string) => {
    setHistory(prev => {
      const next = prev.map(item =>
        item.url === url ? { ...item, save_to_digest: !item.save_to_digest } : item
      )
      saveHistory(next)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-h1 text-drift-text-primary leading-none">Link Drop</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-2">
          Paste any URL — Drift will read it and tell you if it&apos;s worth your time.
        </p>
        <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Input bar */}
      <motion.div
        animate={{
          boxShadow: isStreaming
            ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
            : '0 0 0 1px rgba(255,255,255,0.06)'
        }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-drift-surface backdrop-blur-xl overflow-hidden"
      >
        <div className={cn('flex items-center gap-3 px-4 py-3.5', isStreaming && 'opacity-60 pointer-events-none')}>
          <Link2 className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setInputError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a URL to assess..."
            className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
          />
          <AnimatePresence>
            {inputValue.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
              >
                Assess
                <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {inputError && (
          <p className="px-4 pb-3 text-label text-red-400">{inputError}</p>
        )}
      </motion.div>

      {/* Streaming card */}
      <AnimatePresence>
        {(isStreaming || streamError) && pendingUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <StreamingCard
              url={pendingUrl}
              text={streamText}
              error={streamError}
              onRetry={() => triggerAssessment(pendingUrl)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History list */}
      <AnimatePresence mode="popLayout">
        {history.map((item, i) => (
          <motion.div
            key={item.assessedAt}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <VerdictCard item={item} onToggleSave={handleToggleSave} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!isStreaming && !streamError && history.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-body text-drift-text-secondary mb-1">No links dropped yet.</p>
          <p className="text-body-sm text-drift-text-tertiary">Paste any URL above to assess it.</p>
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add `StreamingCard` and `VerdictCard` sub-components**

Append to `drop/page.tsx`:

```tsx
function StreamingCard({ url, text, error, onRetry }: {
  url: string
  text: string
  error: string | null
  onRetry: () => void
}) {
  return (
    <DriftCard className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent animate-pulse" />
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2.5">
          {error ? (
            <span className="text-label text-red-400">Assessment failed</span>
          ) : (
            <>
              <div className="w-4 h-4 rounded-full border border-drift-accent/30 border-t-drift-accent animate-spin" />
              <span className="text-label text-drift-text-tertiary">Analyzing...</span>
            </>
          )}
        </div>
        <p className="text-label text-drift-text-tertiary truncate">{url.length > 60 ? url.slice(0, 60) + '…' : url}</p>
        {error ? (
          <div className="space-y-2">
            <p className="text-body-sm text-drift-text-secondary">
              Assessment failed. Check your API key or try again.
            </p>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        ) : text ? (
          <p className="text-body-sm text-drift-text-secondary leading-relaxed">
            {text}
            <span className="inline-block w-0.5 h-3.5 bg-drift-accent ml-0.5 animate-pulse align-middle" />
          </p>
        ) : null}
      </div>
    </DriftCard>
  )
}

function VerdictCard({ item, onToggleSave }: {
  item: StoredLinkAssessment
  onToggleSave: (url: string) => void
}) {
  const [saved, setSaved] = useState(item.save_to_digest)
  const config = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.skip
  const contentTypeLabel = CONTENT_TYPE_LABELS[item.content_type] ?? 'Link'
  const truncatedUrl = item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url

  const handleToggle = () => {
    setSaved(prev => !prev)
    onToggleSave(item.url)
  }

  return (
    <DriftCard className="relative overflow-hidden">
      {/* Top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.accent)} />

      <div className="px-5 pt-5 pb-4 space-y-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-label border bg-white/[0.04] border-white/[0.10] text-drift-text-secondary">
            {contentTypeLabel}
          </span>
          <div className="flex-1" />
          <RelevanceScore score={item.relevance_score} />
        </div>

        {/* URL subtitle */}
        <p className="text-label text-drift-text-tertiary truncate">{truncatedUrl}</p>

        {/* Title */}
        <h3 className="text-h2 text-drift-text-primary leading-snug">{item.title}</h3>

        {/* Summary */}
        <p className="text-body text-drift-text-secondary leading-relaxed">{item.summary}</p>

        {/* Verdict pill */}
        <div className={cn(
          'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-body-sm font-medium',
          config.className
        )}>
          {config.label}
        </div>

        {/* Verdict reason */}
        <p className="text-body-sm text-drift-text-secondary leading-relaxed">{item.verdict_reason}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all duration-200 border',
              saved
                ? 'bg-drift-accent/15 text-drift-accent border-drift-accent/30'
                : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12]'
            )}
          >
            <Bookmark className={cn('w-3.5 h-3.5', saved && 'fill-current')} />
            {saved ? 'Saved to digest' : 'Save to digest'}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
        </div>
      </div>
    </DriftCard>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Smoke-test the full flow**

Run `npm run dev` and test:

1. Navigate to `/drop` — should show empty state
2. Paste a valid URL (e.g. `https://github.com/vercel/next.js`) and click Assess
3. Streaming card should appear with live text
4. Once done, VerdictCard should appear at the top of the list with verdict pill
5. Click "Save to digest" — button should toggle to "Saved to digest"
6. Navigate to `/` — "Saved Links" section should appear above the digest cards
7. Navigate to `/drop` again — history should still be there (localStorage persisted)
8. From `/` home, paste a URL in the link drop input and press Enter — should navigate to `/drop?url=...` and auto-trigger

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/drop/page.tsx
git commit -m "feat: implement Link Drop page with history, streaming, and VerdictCard"
```

---

## Final check

- [ ] **Run full test suite and build**

```bash
npx vitest run && npm run build
```

Expected: all tests PASS, build succeeds with no errors

- [ ] **Final commit if any fixups needed**

```bash
git add -p
git commit -m "fix: address Phase 4 build/lint issues"
```
