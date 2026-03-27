# Drop Tab — Link Triage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Drop tab into a personal link triage library with context-aware ranking, AI-powered metadata processing, and read/keep/remove actions.

**Architecture:** localStorage for persistence (key: `drift-saved-links`), Next.js API routes for AI processing (Groq), single-prompt batch scoring, FAB save sheet, link attachment in Ask tab, Save to Links on Feed cards.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Groq (llama-3.3-70b-versatile), Lucide icons, Vitest

---

## File Map

**Create:**
- `src/types/saved-link.ts` — SavedLink interface + LinkType, LinkStatus, LinkSource types
- `src/lib/saved-links.ts` — localStorage CRUD helpers + archiveExpiredLinks + createSavedLink
- `src/lib/__tests__/saved-links.test.ts` — unit tests for saved-links helpers
- `src/app/api/links/route.ts` — POST: fetch OG metadata + Groq summary/tags, returns processed link data
- `src/app/api/links/score/route.ts` — POST: single Groq call scoring all links against context
- `src/components/links/context-bar.tsx` — inline editable context input
- `src/components/links/tag-filter.tsx` — scrollable tag chip filters
- `src/components/links/link-card.tsx` — compact horizontal card with 3 icon action buttons
- `src/components/links/save-sheet.tsx` — FAB + bottom sheet paste input
- `src/components/links/link-picker.tsx` — searchable link picker sheet for Ask tab

**Modify:**
- `src/lib/prompts.ts` — add linkProcessingPrompt() + linkScoringPrompt()
- `src/app/(app)/drop/page.tsx` — full rewrite as link triage library
- `src/app/(app)/ask/page.tsx` — add attachedLink state + link picker + suggestion chips to AskTab
- `src/components/digest/card-actions.tsx` — add onSaveToLinks prop + Save to Links icon button
- `src/app/(app)/layout.tsx` — call archiveExpiredLinks() on mount

---

## Task 1: SavedLink type

**Files:**
- Create: `src/types/saved-link.ts`

- [ ] **Step 1: Create the type file**

```typescript
// src/types/saved-link.ts
export type LinkType = 'video' | 'article' | 'repo' | 'tweet' | 'other'
export type LinkStatus = 'active' | 'read' | 'kept' | 'archived' | 'removed'
export type LinkSource = 'manual' | 'share' | 'feed'

export interface SavedLink {
  id: string
  url: string
  title: string
  summary: string
  thumbnail: string | null
  favicon: string | null
  siteName: string
  type: LinkType
  tags: string[]
  savedAt: string    // ISO date
  expiresAt: string  // savedAt + 7 days
  status: LinkStatus
  source: LinkSource
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/saved-link.ts
git commit -m "feat: add SavedLink type"
```

---

## Task 2: localStorage helpers + tests

**Files:**
- Create: `src/lib/saved-links.ts`
- Create: `src/lib/__tests__/saved-links.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/saved-links.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v },
  removeItem: (k: string) => { delete mockStorage[k] },
})
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

import {
  loadLinks, saveLinks, addLink, updateLinkStatus,
  removeLink, archiveExpiredLinks, getActiveLinks, createSavedLink,
} from '../saved-links'
import type { SavedLink } from '@/types/saved-link'

const mockLink: SavedLink = {
  id: 'abc-123',
  url: 'https://example.com',
  title: 'Test Link',
  summary: 'A test summary',
  thumbnail: null,
  favicon: null,
  siteName: 'example.com',
  type: 'article',
  tags: ['test'],
  savedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-08T00:00:00.000Z',
  status: 'active',
  source: 'manual',
}

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('loadLinks', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadLinks()).toEqual([])
  })
  it('returns parsed links from storage', () => {
    mockStorage['drift-saved-links'] = JSON.stringify([mockLink])
    expect(loadLinks()).toEqual([mockLink])
  })
  it('returns empty array on invalid JSON', () => {
    mockStorage['drift-saved-links'] = 'not-json'
    expect(loadLinks()).toEqual([])
  })
})

describe('addLink', () => {
  it('prepends new link to existing links', () => {
    saveLinks([mockLink])
    const newLink = { ...mockLink, id: 'new-1' }
    addLink(newLink)
    expect(loadLinks()[0].id).toBe('new-1')
  })
})

describe('updateLinkStatus', () => {
  it('updates status of matching link', () => {
    saveLinks([mockLink])
    updateLinkStatus('abc-123', 'read')
    expect(loadLinks()[0].status).toBe('read')
  })
  it('does not affect other links', () => {
    const other = { ...mockLink, id: 'other-1' }
    saveLinks([mockLink, other])
    updateLinkStatus('abc-123', 'read')
    expect(loadLinks().find(l => l.id === 'other-1')?.status).toBe('active')
  })
})

describe('removeLink', () => {
  it('removes link by id', () => {
    saveLinks([mockLink])
    removeLink('abc-123')
    expect(loadLinks()).toEqual([])
  })
})

describe('archiveExpiredLinks', () => {
  it('archives active links past their expiry date', () => {
    const expired = { ...mockLink, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([expired])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('archived')
  })
  it('does not archive kept links', () => {
    const kept = { ...mockLink, status: 'kept' as const, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([kept])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('kept')
  })
  it('does not archive read links', () => {
    const read = { ...mockLink, status: 'read' as const, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([read])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('read')
  })
})

describe('getActiveLinks', () => {
  it('excludes removed and archived links', () => {
    const archived = { ...mockLink, id: 'a1', status: 'archived' as const }
    const removed = { ...mockLink, id: 'r1', status: 'removed' as const }
    saveLinks([mockLink, archived, removed])
    expect(getActiveLinks()).toHaveLength(1)
    expect(getActiveLinks()[0].id).toBe('abc-123')
  })
})

describe('createSavedLink', () => {
  it('sets id, savedAt, expiresAt, and status', () => {
    const link = createSavedLink({
      url: 'https://example.com', title: 'Test', summary: 'Summary',
      thumbnail: null, favicon: null, siteName: 'example.com',
      type: 'article', tags: [], source: 'manual',
    })
    expect(link.id).toBe('test-uuid-1234')
    expect(link.status).toBe('active')
    expect(link.savedAt).toBeTruthy()
    expect(link.expiresAt).toBeTruthy()
  })
  it('sets expiresAt to 7 days after savedAt', () => {
    const link = createSavedLink({
      url: 'https://example.com', title: 'Test', summary: 'Summary',
      thumbnail: null, favicon: null, siteName: 'example.com',
      type: 'article', tags: [], source: 'manual',
    })
    const diff = new Date(link.expiresAt).getTime() - new Date(link.savedAt).getTime()
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- saved-links
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement saved-links.ts**

```typescript
// src/lib/saved-links.ts
import type { SavedLink } from '@/types/saved-link'

const STORAGE_KEY = 'drift-saved-links'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export function loadLinks(): SavedLink[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedLink[]) : []
  } catch {
    return []
  }
}

export function saveLinks(links: SavedLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

export function addLink(link: SavedLink): void {
  saveLinks([link, ...loadLinks()])
}

export function updateLinkStatus(id: string, status: SavedLink['status']): void {
  saveLinks(loadLinks().map(l => l.id === id ? { ...l, status } : l))
}

export function removeLink(id: string): void {
  saveLinks(loadLinks().filter(l => l.id !== id))
}

export function archiveExpiredLinks(): void {
  const now = new Date().toISOString()
  saveLinks(
    loadLinks().map(l =>
      l.status === 'active' && l.expiresAt < now
        ? { ...l, status: 'archived' as const }
        : l
    )
  )
}

export function getActiveLinks(): SavedLink[] {
  return loadLinks().filter(l => l.status !== 'removed' && l.status !== 'archived')
}

export function createSavedLink(
  partial: Omit<SavedLink, 'id' | 'savedAt' | 'expiresAt' | 'status'>
): SavedLink {
  const savedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()
  return {
    ...partial,
    id: crypto.randomUUID(),
    savedAt,
    expiresAt,
    status: 'active',
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- saved-links
```
Expected: PASS — all 11 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/saved-links.ts src/lib/__tests__/saved-links.test.ts
git commit -m "feat: add saved-links localStorage helpers with tests"
```

---

## Task 3: Prompt builders

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Add linkProcessingPrompt and linkScoringPrompt to prompts.ts**

Append to the end of `src/lib/prompts.ts`:

```typescript
export function linkProcessingPrompt(
  url: string,
  title: string,
  description: string
): string {
  return `You are processing a saved link for a developer's personal library.

URL: ${url}
Title: ${title}
Description: ${description}

Return a JSON object with exactly these fields:
{
  "summary": "<one sentence — what this is and why a developer would care, max 120 chars>",
  "tags": ["<tag1>", "<tag2>"],
  "type": "<video|article|repo|tweet|other>"
}

Rules:
- summary: one sentence, plain language, no hype
- tags: 1–3 lowercase kebab-case strings (e.g. "react", "ai-tools", "system-design")
- type: youtube.com/vimeo.com/loom.com → video, github.com → repo, x.com/twitter.com → tweet, else article
- Return ONLY the JSON object, no markdown fences`
}

export function linkScoringPrompt(
  context: string,
  links: Array<{ id: string; title: string; summary: string }>
): string {
  const list = links
    .map((l, i) => `${i + 1}. [${l.id}] ${l.title} — ${l.summary}`)
    .join('\n')
  return `You are scoring saved links by relevance to a developer's current work.

Current context: "${context}"

Links to score:
${list}

Return a JSON array with exactly these fields per item:
[{ "id": "<link id>", "score": <0-10> }]

Scoring guide:
- 8–10: directly relevant to the context right now
- 5–7: somewhat related, useful soon
- 0–4: unrelated or too generic

Return ONLY the JSON array, no markdown fences`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat: add link processing and scoring prompt builders"
```

---

## Task 4: POST /api/links — save endpoint

**Files:**
- Create: `src/app/api/links/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/links/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { linkProcessingPrompt } from '@/lib/prompts'
import { stripHtml } from '@/lib/html-strip'
import type { LinkType } from '@/types/saved-link'

interface SaveRequestBody {
  url: string
  // Optional: feed cards can pass these directly to skip fetching
  prefetchedTitle?: string
  prefetchedSummary?: string
}

interface OGMetadata {
  title: string
  description: string
  image: string | null
  siteName: string
  favicon: string | null
}

function detectType(url: string): LinkType {
  try {
    const { hostname } = new URL(url)
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(hostname)) return 'video'
    if (/github\.com/.test(hostname)) return 'repo'
    if (/x\.com|twitter\.com/.test(hostname)) return 'tweet'
  } catch { /* ignore */ }
  return 'article'
}

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
}

function extractOGMetadata(html: string, url: string): OGMetadata {
  const getOG = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
    return m?.[1]?.trim() ?? null
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)

  let favicon: string | null = null
  if (faviconMatch?.[1]) {
    try { favicon = new URL(faviconMatch[1], url).href } catch { /* ignore */ }
  }
  if (!favicon) {
    try { favicon = new URL('/favicon.ico', url).href } catch { /* ignore */ }
  }

  return {
    title: getOG('title') ?? titleMatch?.[1]?.trim() ?? url,
    description: getOG('description') ?? '',
    image: getOG('image') ?? null,
    siteName: getOG('site_name') ?? (new URL(url).hostname.replace('www.', '')),
    favicon,
  }
}

async function fetchMetadata(url: string): Promise<OGMetadata> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DriftBot/1.0)' },
    })
    if (!res.ok) throw new Error('fetch failed')
    const html = await res.text()
    return extractOGMetadata(html, url)
  } catch {
    try {
      const hostname = new URL(url).hostname.replace('www.', '')
      return { title: url, description: '', image: null, siteName: hostname, favicon: null }
    } catch {
      return { title: url, description: '', image: null, siteName: '', favicon: null }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, prefetchedTitle, prefetchedSummary } = await req.json() as SaveRequestBody

    const meta = await fetchMetadata(url)
    const title = prefetchedTitle ?? meta.title
    const description = meta.description

    // Determine thumbnail
    const ytThumb = getYouTubeThumbnail(url)
    const thumbnail = ytThumb ?? meta.image

    // AI processing: summary + tags + type confirmation
    let summary = prefetchedSummary ?? ''
    let tags: string[] = []
    let type: LinkType = detectType(url)

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: linkProcessingPrompt(url, title, description) }],
        response_format: { type: 'json_object' },
        max_tokens: 256,
      })
      const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
      summary = raw.summary ?? summary
      tags = Array.isArray(raw.tags) ? raw.tags.slice(0, 3) : []
      if (['video', 'article', 'repo', 'tweet', 'other'].includes(raw.type)) {
        type = raw.type as LinkType
      }
    } catch {
      // fall back to empty summary + empty tags
    }

    return NextResponse.json({
      title,
      summary,
      tags,
      type,
      thumbnail,
      favicon: meta.favicon,
      siteName: meta.siteName,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/links/route.ts
git commit -m "feat: add POST /api/links save endpoint with OG fetch and AI processing"
```

---

## Task 5: POST /api/links/score — batch scoring endpoint

**Files:**
- Create: `src/app/api/links/score/route.ts`

- [ ] **Step 1: Create the scoring route**

```typescript
// src/app/api/links/score/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { linkScoringPrompt } from '@/lib/prompts'

interface ScoreRequestBody {
  context: string
  links: Array<{ id: string; title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { context, links } = await req.json() as ScoreRequestBody

    if (!context.trim() || links.length === 0) {
      return NextResponse.json([])
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: linkScoringPrompt(context, links) }],
      response_format: { type: 'json_object' },
      max_tokens: 512,
    })

    const raw = JSON.parse(completion.choices[0].message.content ?? '[]')
    // Groq json_object mode wraps arrays — handle both shapes
    const scores: Array<{ id: string; score: number }> = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.scores)
        ? raw.scores
        : []

    return NextResponse.json(scores)
  } catch {
    return NextResponse.json([])
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/links/score/route.ts
git commit -m "feat: add POST /api/links/score batch relevance scoring endpoint"
```

---

## Task 6: ContextBar + TagFilter components

**Files:**
- Create: `src/components/links/context-bar.tsx`
- Create: `src/components/links/tag-filter.tsx`

- [ ] **Step 1: Create ContextBar**

```typescript
// src/components/links/context-bar.tsx
'use client'

import { useState } from 'react'
import { Zap, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextBarProps {
  value: string
  onChange: (value: string) => void
}

export function ContextBar({ value, onChange }: ContextBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) onChange(trimmed)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  return (
    <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3.5 py-2.5">
      <Zap className="w-3.5 h-3.5 text-drift-accent shrink-0" strokeWidth={1.5} />
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            className="flex-1 bg-transparent text-body-sm text-drift-text-primary outline-none placeholder:text-drift-text-tertiary"
            placeholder="What are you building right now?"
          />
          <button onClick={commit} className="text-drift-accent shrink-0">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </>
      ) : (
        <>
          <span className={cn(
            'flex-1 text-body-sm truncate',
            value ? 'text-drift-text-secondary' : 'text-drift-text-tertiary'
          )}>
            {value || 'What are you building right now?'}
          </span>
          <button
            onClick={() => { setDraft(value); setEditing(true) }}
            className="text-drift-text-tertiary hover:text-drift-accent transition-colors duration-200 shrink-0"
          >
            <Pencil className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create TagFilter**

```typescript
// src/components/links/tag-filter.tsx
'use client'

import { cn } from '@/lib/utils'

interface TagFilterProps {
  tags: string[]
  active: string[]
  total: number
  onToggle: (tag: string) => void
  onClear: () => void
}

export function TagFilter({ tags, active, total, onToggle, onClear }: TagFilterProps) {
  const allSelected = active.length === 0

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      <button
        onClick={onClear}
        className={cn(
          'px-3 py-1.5 rounded-full text-label font-medium shrink-0 transition-all duration-200',
          allSelected
            ? 'bg-drift-accent text-[#0a0f1a]'
            : 'bg-white/[0.05] border border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary'
        )}
      >
        All {total}
      </button>
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          className={cn(
            'px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200',
            active.includes(tag)
              ? 'bg-drift-accent/15 border border-drift-accent/30 text-drift-accent'
              : 'bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/links/context-bar.tsx src/components/links/tag-filter.tsx
git commit -m "feat: add ContextBar and TagFilter components"
```

---

## Task 7: LinkCard component

**Files:**
- Create: `src/components/links/link-card.tsx`

- [ ] **Step 1: Create LinkCard**

```typescript
// src/components/links/link-card.tsx
'use client'

import { Check, Bookmark, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'

const TYPE_FALLBACK: Record<string, string> = {
  video: '▶',
  repo: '⌥',
  tweet: '𝕏',
  article: '📄',
  other: '🔗',
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface LinkCardProps {
  link: SavedLink
  onRead: () => void
  onKeep: () => void
  onRemove: () => void
}

export function LinkCard({ link, onRead, onKeep, onRemove }: LinkCardProps) {
  const isRead = link.status === 'read'
  const isKept = link.status === 'kept'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isRead ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border transition-colors duration-200',
        isKept
          ? 'bg-[#111827] border-amber-500/30'
          : 'bg-[#111827] border-white/[0.05]'
      )}
    >
      <div className="flex gap-3 items-center p-3">
        {/* Thumbnail */}
        <div className="w-[60px] h-[44px] rounded-lg overflow-hidden shrink-0 relative bg-white/[0.04]">
          {link.thumbnail ? (
            <img
              src={link.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg text-drift-text-tertiary">
              {TYPE_FALLBACK[link.type] ?? '🔗'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-body-sm font-medium text-drift-text-primary truncate leading-snug mb-0.5',
            isRead && 'line-through text-drift-text-tertiary'
          )}>
            {link.title}
          </p>
          <p className="text-label text-drift-text-tertiary line-clamp-2 leading-snug mb-1.5">
            {link.summary}
          </p>
          <div className="flex items-center justify-between gap-2">
            {/* Source + age + tags */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {link.favicon && (
                <img src={link.favicon} alt="" className="w-3 h-3 rounded-sm shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <span className="text-label text-drift-text-tertiary shrink-0">{link.siteName}</span>
              <span className="text-label text-white/[0.15] shrink-0">·</span>
              <span className="text-label text-drift-text-tertiary shrink-0">{formatAge(link.savedAt)}</span>
              {link.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-label text-drift-text-tertiary bg-white/[0.05] px-1.5 py-0.5 rounded-full shrink-0">
                  {tag}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onRead}
                title="Mark as read"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isRead
                    ? 'bg-green-900/40 border border-green-700/50'
                    : 'bg-green-950/60 border border-green-900/50 hover:border-green-700/50'
                )}
              >
                <Check className={cn('w-3.5 h-3.5', isRead ? 'text-green-400' : 'text-green-700')} strokeWidth={2.5} />
              </button>
              <button
                onClick={onKeep}
                title="Keep — won't auto-archive"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isKept
                    ? 'bg-amber-900/40 border border-amber-600/60'
                    : 'bg-amber-950/40 border border-amber-900/40 hover:border-amber-700/50'
                )}
              >
                <Bookmark
                  className={cn('w-3.5 h-3.5', isKept ? 'text-amber-400 fill-amber-400' : 'text-amber-800')}
                  strokeWidth={1.5}
                />
              </button>
              <button
                onClick={onRemove}
                title="Remove"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-950/40 border border-red-900/40 hover:border-red-700/50 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-800 hover:text-red-500 transition-colors" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/link-card.tsx
git commit -m "feat: add LinkCard component with read/keep/remove actions"
```

---

## Task 8: SaveSheet component (FAB + paste input)

**Files:**
- Create: `src/components/links/save-sheet.tsx`

- [ ] **Step 1: Create SaveSheet**

```typescript
// src/components/links/save-sheet.tsx
'use client'

import { useState } from 'react'
import { Plus, X, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SaveSheetProps {
  isSaving: boolean
  onSave: (url: string) => void
}

export function SaveSheet({ isSaving, onSave }: SaveSheetProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const handleSave = () => {
    const trimmed = url.trim()
    if (!trimmed || isSaving) return
    onSave(trimmed)
    setUrl('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1424] border-t border-white/[0.08] rounded-t-2xl px-5 pt-5 pb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-semibold text-drift-text-primary">Save a link</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className={cn(
              'flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3',
              'focus-within:border-drift-accent/40 transition-colors duration-200'
            )}>
              <LinkIcon className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
              <input
                autoFocus
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste a URL..."
                className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!url.trim() || isSaving}
              className={cn(
                'mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-body font-semibold transition-all duration-200',
                url.trim() && !isSaving
                  ? 'bg-drift-accent text-[#0a0f1a] hover:bg-drift-accent/90'
                  : 'bg-white/[0.05] text-drift-text-tertiary cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : 'Save Link'}
              {!isSaving && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-24 right-5 z-30',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-drift-accent flex items-center justify-center',
          'transition-opacity duration-200',
          open && 'opacity-0 pointer-events-none'
        )}
      >
        <Plus className="w-6 h-6 text-[#0a0f1a]" strokeWidth={2.5} />
      </motion.button>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/save-sheet.tsx
git commit -m "feat: add SaveSheet FAB and paste input bottom sheet"
```

---

## Task 9: Drop page full rewrite

**Files:**
- Modify: `src/app/(app)/drop/page.tsx`

- [ ] **Step 1: Rewrite the Drop page**

```typescript
// src/app/(app)/drop/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Clock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProfile } from '@/hooks/use-profile'
import { ContextBar } from '@/components/links/context-bar'
import { TagFilter } from '@/components/links/tag-filter'
import { LinkCard } from '@/components/links/link-card'
import { SaveSheet } from '@/components/links/save-sheet'
import {
  loadLinks, addLink, updateLinkStatus, removeLink, createSavedLink, getActiveLinks,
} from '@/lib/saved-links'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'

export default function DropPage() {
  const { profile } = useProfile()

  const [links, setLinks] = useState<SavedLink[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [context, setContext] = useState('')
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [savingUrl, setSavingUrl] = useState<string | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  // Load links on mount
  useEffect(() => {
    setLinks(loadLinks())
    if (profile?.currentContext) setContext(profile.currentContext)
  }, [profile])

  // Score links when context changes
  const scoreLinks = useCallback(async (ctx: string, activeLinks: SavedLink[]) => {
    if (!ctx.trim() || activeLinks.length === 0) return
    setIsScoring(true)
    try {
      const payload = activeLinks.map(l => ({ id: l.id, title: l.title, summary: l.summary }))
      const res = await fetch('/api/links/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx, links: payload }),
      })
      const result = await res.json() as Array<{ id: string; score: number }>
      const map: Record<string, number> = {}
      result.forEach(({ id, score }) => { map[id] = score })
      setScores(map)
    } catch {
      // scoring failed silently — links show in "Other" section
    } finally {
      setIsScoring(false)
    }
  }, [])

  useEffect(() => {
    const active = getActiveLinks()
    scoreLinks(context, active)
  }, [context, scoreLinks])

  // Save a new link
  const handleSave = useCallback(async (url: string) => {
    setIsSaving(true)
    setSavingUrl(url)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      const link = createSavedLink({ url, source: 'manual', ...data })
      addLink(link)
      setLinks(loadLinks())
      // Re-score with new link
      scoreLinks(context, getActiveLinks())
    } catch {
      // save failed silently
    } finally {
      setIsSaving(false)
      setSavingUrl(null)
    }
  }, [context, scoreLinks])

  // Card actions
  const handleRead = useCallback((id: string) => {
    updateLinkStatus(id, 'read')
    setLinks(loadLinks())
  }, [])

  const handleKeep = useCallback((id: string, currentStatus: SavedLink['status']) => {
    updateLinkStatus(id, currentStatus === 'kept' ? 'active' : 'kept')
    setLinks(loadLinks())
  }, [])

  const handleRemove = useCallback((id: string) => {
    removeLink(id)
    setLinks(loadLinks())
  }, [])

  // Context change
  const handleContextChange = useCallback((value: string) => {
    setContext(value)
  }, [])

  // Derived data
  const activeLinks = useMemo(() =>
    links.filter(l => l.status !== 'removed' && l.status !== 'archived'),
    [links]
  )

  const allTags = useMemo(() => {
    const set = new Set<string>()
    activeLinks.forEach(l => l.tags.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [activeLinks])

  const filteredLinks = useMemo(() => {
    let result = activeLinks
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.siteName.toLowerCase().includes(q)
      )
    }
    if (activeTags.length > 0) {
      result = result.filter(l => activeTags.some(t => l.tags.includes(t)))
    }
    return result
  }, [activeLinks, search, activeTags])

  const relevantLinks = useMemo(() =>
    filteredLinks
      .filter(l => (scores[l.id] ?? 0) >= 6)
      .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)),
    [filteredLinks, scores]
  )

  const otherLinks = useMemo(() =>
    filteredLinks
      .filter(l => (scores[l.id] ?? 0) < 6)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [filteredLinks, scores]
  )

  // Expiry nudge: links expiring within 24h
  const expiringCount = useMemo(() => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    return activeLinks.filter(l => l.status === 'active' && l.expiresAt < soon).length
  }, [activeLinks])

  const toggleTag = (tag: string) =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-drift-text-primary leading-none">Saved Links</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-1.5">
          {activeLinks.length} {activeLinks.length === 1 ? 'link' : 'links'} saved
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Context bar */}
      <ContextBar value={context} onChange={handleContextChange} />

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3.5 py-2.5">
        <Search className="w-3.5 h-3.5 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search links..."
          className="flex-1 bg-transparent text-body-sm text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
        />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <TagFilter
          tags={allTags}
          active={activeTags}
          total={activeLinks.length}
          onToggle={toggleTag}
          onClear={() => setActiveTags([])}
        />
      )}

      {/* Expiry nudge */}
      {expiringCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 bg-amber-950/40 border border-amber-800/30 rounded-xl px-3.5 py-2.5"
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.5} />
          <p className="text-label text-amber-400">
            {expiringCount} {expiringCount === 1 ? 'link' : 'links'} auto-archive tomorrow — act on {expiringCount === 1 ? 'it' : 'them'} or they&apos;ll drift away
          </p>
        </motion.div>
      )}

      {/* Skeleton card while saving */}
      {isSaving && savingUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/[0.05] bg-[#111827] p-3"
        >
          <div className="flex gap-3 items-center">
            <div className="w-[60px] h-[44px] rounded-lg bg-white/[0.05] shrink-0 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/[0.07] rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-white/[0.05] rounded animate-pulse w-1/2" />
              <div className="flex gap-1.5 items-center">
                <div className="h-2 bg-white/[0.04] rounded animate-pulse w-16" />
                <div className="h-4 bg-drift-accent/10 rounded-full animate-pulse w-12" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Relevant section */}
      {relevantLinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-label uppercase tracking-wider text-drift-text-tertiary font-semibold">
              Relevant to you now
            </span>
            <span className="text-label text-drift-text-tertiary">{relevantLinks.length}</span>
          </div>
          <AnimatePresence mode="popLayout">
            {relevantLinks.map(link => (
              <LinkCard
                key={link.id}
                link={link}
                onRead={() => handleRead(link.id)}
                onKeep={() => handleKeep(link.id, link.status)}
                onRemove={() => handleRemove(link.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Other saved section */}
      {otherLinks.length > 0 && (
        <div className={cn('space-y-2', relevantLinks.length > 0 && 'mt-2')}>
          <div className="flex items-center justify-between">
            <span className="text-label uppercase tracking-wider text-drift-text-tertiary/60 font-semibold">
              {relevantLinks.length > 0 ? 'Other saved' : 'Saved links'}
            </span>
            <span className="text-label text-drift-text-tertiary/60">{otherLinks.length}</span>
          </div>
          <div className={cn(relevantLinks.length > 0 && 'opacity-70')}>
            <AnimatePresence mode="popLayout">
              {otherLinks.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onRead={() => handleRead(link.id)}
                  onKeep={() => handleKeep(link.id, link.status)}
                  onRemove={() => handleRemove(link.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeLinks.length === 0 && !isSaving && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-body text-drift-text-secondary mb-1">No saved links yet.</p>
          <p className="text-body-sm text-drift-text-tertiary">
            Tap + to save a link, or share one from your phone.
          </p>
        </motion.div>
      )}

      {/* FAB save sheet */}
      <SaveSheet isSaving={isSaving} onSave={handleSave} />
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify the page loads**

```bash
npm run dev
```
Open `http://localhost:3000/drop` — should show empty state + FAB + no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/drop/page.tsx
git commit -m "feat: rewrite Drop page as link triage library"
```

---

## Task 10: LinkPicker component

**Files:**
- Create: `src/components/links/link-picker.tsx`

- [ ] **Step 1: Create LinkPicker**

```typescript
// src/components/links/link-picker.tsx
'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'

interface LinkPickerProps {
  links: SavedLink[]
  onSelect: (link: SavedLink) => void
  onClose: () => void
}

export function LinkPicker({ links, onSelect, onClose }: LinkPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = links.filter(l => {
    const q = search.toLowerCase()
    return !q || l.title.toLowerCase().includes(q) || l.siteName.toLowerCase().includes(q)
  })

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1424] border-t border-white/[0.08] rounded-t-2xl px-5 pt-5 pb-8 max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-body font-semibold text-drift-text-primary">Attach a link</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-drift-text-tertiary"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.07] rounded-xl px-3.5 py-2.5 mb-3 shrink-0">
          <Search className="w-3.5 h-3.5 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search saved links..."
            className="flex-1 bg-transparent text-body-sm text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
          />
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-body-sm text-drift-text-tertiary text-center py-8">No links found.</p>
          ) : (
            filtered.map(link => (
              <button
                key={link.id}
                onClick={() => { onSelect(link); onClose() }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors duration-150 text-left"
              >
                {link.thumbnail ? (
                  <img src={link.thumbnail} alt="" className="w-10 h-8 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-8 rounded-md bg-white/[0.05] shrink-0 flex items-center justify-center text-sm">
                    {link.type === 'video' ? '▶' : link.type === 'repo' ? '⌥' : '📄'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-drift-text-primary truncate">{link.title}</p>
                  <p className="text-label text-drift-text-tertiary">{link.siteName}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/link-picker.tsx
git commit -m "feat: add LinkPicker sheet component for Ask tab"
```

---

## Task 11: Ask page — link attachment + suggestion chips

**Files:**
- Modify: `src/app/(app)/ask/page.tsx`

- [ ] **Step 1: Add attachedLink state + link picker + suggestion chips to AskTab**

In `src/app/(app)/ask/page.tsx`, make the following additions to the `AskTab` function:

Add import at top of file:
```typescript
import { Paperclip, X as XIcon } from 'lucide-react'
import { LinkPicker } from '@/components/links/link-picker'
import { getActiveLinks } from '@/lib/saved-links'
import type { SavedLink } from '@/types/saved-link'
```

Replace the `AskTab` function with:

```typescript
function AskTab({ onSaveToHistory }: { onSaveToHistory: (v: StoredVerdict) => void }) {
  const { profile } = useProfile()
  const { text: streamText, isStreaming, error: streamError, stream, reset } = useStreaming()

  const [inputValue, setInputValue] = useState('')
  const [currentVerdict, setCurrentVerdict] = useState<Verdict | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [originalQuery, setOriginalQuery] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [attachedLink, setAttachedLink] = useState<SavedLink | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const savedLinks = useMemo(() => getActiveLinks(), [])

  const verdictReceived = useRef(false)

  const GENERAL_CHIPS = [
    "What's the difference between RSC and client components?",
    "Should I learn Rust as a JS dev?",
    "Explain MCP to me like I'm a senior dev",
  ]

  const LINK_CHIPS = [
    "💡 What are the key takeaways?",
    "🧠 Explain this concept to me",
    "🎯 Is this relevant to what I'm building?",
    "⚡ Give me a quick summary",
  ]

  const triggerQuery = useCallback(async (query: string, threadMessages: Message[], isFollowUp = false) => {
    if (!profile) return
    verdictReceived.current = false
    setParseError(null)
    reset()

    const finalText = await stream(
      () => fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          query,
          messages: threadMessages.length > 0 ? threadMessages : undefined,
        }),
      }),
      isFollowUp ? undefined : {
        onDone: (data, accumulated) => {
          verdictReceived.current = true
          const raw = data as Omit<Verdict, 'id' | 'query' | 'createdAt'>
          const verdict: Verdict = {
            ...raw,
            id: crypto.randomUUID(),
            query,
            createdAt: new Date().toISOString(),
          }
          setCurrentVerdict(verdict)
          const assistantMessage: Message = { role: 'assistant', content: accumulated }
          const newMessages: Message[] = [...threadMessages, assistantMessage]
          setMessages(newMessages)
          const stored: StoredVerdict = { ...verdict, messages: newMessages }
          onSaveToHistory(stored)
        },
      }
    )

    if (isFollowUp) {
      const assistantMessage: Message = { role: 'assistant', content: finalText }
      setMessages(prev => [...prev, assistantMessage])
    } else if (!verdictReceived.current) {
      setParseError('Could not parse verdict. Try again.')
    }
  }, [profile, stream, reset, onSaveToHistory])

  const handleAsk = useCallback((overrideQuery?: string) => {
    let query = (overrideQuery ?? inputValue).trim()
    if (!query || isStreaming) return

    // Prepend link context if attached
    if (attachedLink) {
      query = `[About this link: "${attachedLink.title}" — ${attachedLink.summary}]\n\n${query}`
    }

    setCurrentVerdict(null)
    setMessages([])
    setParseError(null)
    setOriginalQuery(query)
    setInputValue('')

    const initialMessages: Message[] = [{ role: 'user', content: query }]
    setMessages(initialMessages)
    triggerQuery(query, initialMessages)
  }, [inputValue, isStreaming, attachedLink, triggerQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAsk()
  }

  const showStreamingCard = !currentVerdict && (isStreaming || parseError || !!streamError)
  const chips = attachedLink ? LINK_CHIPS : GENERAL_CHIPS

  return (
    <div className="space-y-4">
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
        {/* Attached link chip */}
        <AnimatePresence>
          {attachedLink && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-1.5 w-fit max-w-full">
                <Paperclip className="w-3 h-3 text-drift-accent shrink-0" strokeWidth={1.5} />
                <span className="text-label text-drift-text-secondary truncate max-w-[220px]">
                  {attachedLink.title}
                </span>
                <button onClick={() => setAttachedLink(null)} className="text-drift-text-tertiary hover:text-drift-text-secondary shrink-0">
                  <XIcon className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn('flex items-center gap-3 px-4 py-3.5', isStreaming && 'opacity-60 pointer-events-none')}>
          <Sparkles className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a tool or skill..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none disabled:opacity-50"
          />
          {/* Attach link button */}
          <button
            onClick={() => setShowPicker(true)}
            disabled={isStreaming}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200',
              attachedLink
                ? 'text-drift-accent bg-drift-accent/10'
                : 'text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/[0.05]'
            )}
            title="Attach a saved link"
          >
            <Paperclip className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <AnimatePresence>
            {inputValue.trim() && !isStreaming && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => handleAsk()}
                className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
              >
                Ask
                <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Suggestion chips — only before first query */}
      {!isStreaming && !currentVerdict && !parseError && !streamError && (
        <div className="space-y-2">
          <p className="text-label text-drift-text-tertiary uppercase tracking-wider">
            {attachedLink ? 'Ask about this link' : 'Try asking'}
          </p>
          <div className="flex flex-col gap-2">
            {chips.map(chip => (
              <button
                key={chip}
                onClick={() => { setInputValue(chip); handleAsk(chip) }}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/[0.05] hover:border-white/[0.10] transition-all duration-200"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Streaming card */}
      <AnimatePresence>
        {showStreamingCard && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <StreamingCard
              text={streamText}
              error={parseError ?? streamError}
              onRetry={() => {
                setParseError(null)
                const initialMessages: Message[] = [{ role: 'user', content: originalQuery }]
                triggerQuery(originalQuery, initialMessages)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verdict card + conversation thread */}
      <AnimatePresence>
        {currentVerdict && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <VerdictCard verdict={currentVerdict} />
            <ConversationThread
              messages={messages}
              isStreaming={isStreaming}
              streamText={streamText}
              onFollowUp={(followUp) => {
                const newMessages: Message[] = [...messages, { role: 'user', content: followUp }]
                setMessages(newMessages)
                triggerQuery(originalQuery, newMessages, true)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link picker sheet */}
      <AnimatePresence>
        {showPicker && (
          <LinkPicker
            links={savedLinks}
            onSelect={setAttachedLink}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

Also add `useMemo` to the import from React at the top: `import { useState, useRef, useCallback, useMemo } from 'react'`

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/ask/page.tsx
git commit -m "feat: add link attachment and suggestion chips to Ask tab"
```

---

## Task 12: Feed card actions — Save to Links

**Files:**
- Modify: `src/components/digest/card-actions.tsx`

- [ ] **Step 1: Add onSaveToLinks prop and button to CardActions**

Replace `src/components/digest/card-actions.tsx` with:

```typescript
'use client'

import { Bookmark, Eye, ChevronDown, ChevronUp, Library } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CardAction } from '@/types/digest'

interface CardActionsProps {
  cardId: string
  action?: CardAction
  isExpanded?: boolean
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
  onSaveToLinks?: () => void
}

export function CardActions({ cardId, action, isExpanded, onAction, onGoDeeper, onSaveToLinks }: CardActionsProps) {
  if (action && action !== 'go_deeper') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]"
      >
        <span className={cn(
          'text-label px-3 py-1.5 rounded-full border',
          action === 'save'
            ? 'text-drift-accent border-drift-accent/30 bg-drift-accent/10'
            : 'text-drift-muted border-white/10 bg-white/5'
        )}>
          {action === 'save' ? 'Saved' : 'Read'}
        </span>
      </motion.div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
      <button
        onClick={() => onAction('save')}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'text-drift-text-tertiary hover:text-drift-accent hover:bg-drift-accent/10',
          'transition-all duration-200'
        )}
        title="Save"
      >
        <Bookmark className="w-4 h-4" strokeWidth={1.5} />
      </button>

      <button
        onClick={() => onAction('read')}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/5',
          'transition-all duration-200'
        )}
        title="Mark as read"
      >
        <Eye className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {onSaveToLinks && (
        <button
          onClick={onSaveToLinks}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'text-drift-text-tertiary hover:text-emerald-400 hover:bg-emerald-400/10',
            'transition-all duration-200'
          )}
          title="Save to Links"
        >
          <Library className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={onGoDeeper}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'text-label text-drift-accent',
          'hover:bg-drift-accent/10 transition-all duration-200',
          isExpanded && 'bg-drift-accent/10'
        )}
      >
        Go deeper
        <AnimatePresence mode="wait">
          {isExpanded
            ? <ChevronUp key="up" className="w-3.5 h-3.5" strokeWidth={1.5} />
            : <ChevronDown key="down" className="w-3.5 h-3.5" strokeWidth={1.5} />
          }
        </AnimatePresence>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire up onSaveToLinks in digest-screen.tsx**

Find where `CardActions` is rendered in `src/components/digest/digest-screen.tsx` and add the `onSaveToLinks` prop:

```typescript
// Add import at top of digest-screen.tsx
import { addLink, createSavedLink } from '@/lib/saved-links'
import type { DigestCard } from '@/types/digest'

// Add this helper function inside the component or above it:
async function saveDigestCardToLinks(card: DigestCard) {
  if (!card.source_url) return
  try {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: card.source_url,
        prefetchedTitle: card.title,
        prefetchedSummary: card.summary,
      }),
    })
    const data = await res.json()
    const link = createSavedLink({
      url: card.source_url,
      source: 'feed',
      ...data,
    })
    addLink(link)
  } catch {
    // silent fail
  }
}
```

Then on the `<CardActions>` JSX, add:
```typescript
onSaveToLinks={card.source_url ? () => saveDigestCardToLinks(card) : undefined}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/digest/card-actions.tsx src/components/digest/digest-screen.tsx
git commit -m "feat: add Save to Links action on digest cards"
```

---

## Task 13: Auto-archive on app load

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Read `src/app/(app)/layout.tsx` to understand its current structure.

- [ ] **Step 2: Add archiveExpiredLinks call on mount**

Add a client component wrapper that calls `archiveExpiredLinks()` once on mount. If the layout is already a client component, add the effect directly. If it's a server component, create a small client component:

```typescript
// If layout.tsx is a server component, create this file:
// src/components/ui/archive-guard.tsx
'use client'

import { useEffect } from 'react'
import { archiveExpiredLinks } from '@/lib/saved-links'

export function ArchiveGuard() {
  useEffect(() => {
    archiveExpiredLinks()
  }, [])
  return null
}
```

Then in `src/app/(app)/layout.tsx`, render `<ArchiveGuard />` inside the layout.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/layout.tsx src/components/ui/archive-guard.tsx
git commit -m "feat: auto-archive expired links on app load"
```

---

## Final verification

- [ ] Run full test suite: `npm test` — all tests pass
- [ ] Run dev server: `npm run dev` — no TypeScript errors
- [ ] Open `/drop` — empty state + FAB visible
- [ ] Tap FAB → sheet opens → paste a URL → card appears with skeleton then populates
- [ ] ✓ Read, 🔖 Keep, 🗑 Remove all work on cards
- [ ] Open `/ask` → suggestion chips visible → 📎 attach button works → chips update when link attached
- [ ] Open `/` (feed) → digest cards have Library icon button
