# Drop Tab Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collections, save-time notes, AI clustering nudge, and a weekly digest banner to the Drop tab.

**Architecture:** All collection state lives in localStorage via a new `saved-collections.ts` module mirroring the existing `saved-links.ts` pattern. `SavedLink` gains `collectionIds` and `note` fields (backwards-compatible defaults). Two new API routes (`/api/links/cluster`, `/api/links/digest`) use OpenRouter for AI features. UI is wired in `drop/page.tsx` with a new `CollectionBar`, updated `LinkCard`, `CollectionPicker`, `ClusterNudge`, and `WeeklyDigestBanner` components.

**Tech Stack:** Next.js App Router, React, TypeScript, Framer Motion, Vitest, localStorage, OpenRouter via OpenAI SDK

---

### Task 1: Extend types

**Files:**
- Modify: `src/types/saved-link.ts`
- Create: `src/types/collection.ts`

- [ ] **Step 1: Add `collectionIds` and `note` to `SavedLink`**

Replace the entire content of `src/types/saved-link.ts` with:

```ts
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
  collectionIds: string[]   // new — defaults to []
  note: string              // new — defaults to ''
  savedAt: string
  expiresAt: string
  status: LinkStatus
  source: LinkSource
}
```

- [ ] **Step 2: Create `src/types/collection.ts`**

```ts
export interface Collection {
  id: string
  name: string
  emoji: string
  createdAt: string
  source: 'manual' | 'ai-suggested'
}
```

- [ ] **Step 3: Update `createSavedLink` in `src/lib/saved-links.ts` to default the new fields**

Change the function signature and body:

```ts
export function createSavedLink(
  partial: Omit<SavedLink, 'id' | 'savedAt' | 'expiresAt' | 'status' | 'collectionIds' | 'note'>
): SavedLink {
  const savedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()
  return {
    ...partial,
    collectionIds: [],
    note: '',
    id: crypto.randomUUID(),
    savedAt,
    expiresAt,
    status: 'active',
  }
}
```

- [ ] **Step 4: Run existing saved-links tests to confirm they still pass**

```bash
npx vitest run src/lib/__tests__/saved-links.test.ts
```

Expected: all tests PASS (the Omit change is backwards-compatible — callers don't pass these fields)

- [ ] **Step 5: Commit**

```bash
git add src/types/saved-link.ts src/types/collection.ts src/lib/saved-links.ts
git commit -m "feat: extend SavedLink with collectionIds/note, add Collection type"
```

---

### Task 2: `saved-collections.ts` CRUD module

**Files:**
- Create: `src/lib/saved-collections.ts`
- Create: `src/lib/__tests__/saved-collections.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/saved-collections.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v },
  removeItem: (k: string) => { delete mockStorage[k] },
})
vi.stubGlobal('crypto', { randomUUID: () => 'col-uuid-1234' })

import {
  loadCollections, saveCollections, getCollections,
  addCollection, updateCollection, removeCollection, createCollection,
} from '../saved-collections'
import type { Collection } from '@/types/collection'

const mockCol: Collection = {
  id: 'col-1',
  name: 'Research',
  emoji: '📚',
  createdAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
}

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('loadCollections', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadCollections()).toEqual([])
  })
  it('returns parsed collections from storage', () => {
    mockStorage['drift-saved-collections'] = JSON.stringify([mockCol])
    expect(loadCollections()).toEqual([mockCol])
  })
  it('returns empty array on invalid JSON', () => {
    mockStorage['drift-saved-collections'] = 'bad'
    expect(loadCollections()).toEqual([])
  })
})

describe('addCollection', () => {
  it('appends collection to existing list', () => {
    saveCollections([mockCol])
    const col2 = { ...mockCol, id: 'col-2', name: 'Auth' }
    addCollection(col2)
    expect(loadCollections()).toHaveLength(2)
    expect(loadCollections()[1].id).toBe('col-2')
  })
})

describe('updateCollection', () => {
  it('updates name and emoji of matching collection', () => {
    saveCollections([mockCol])
    updateCollection('col-1', { name: 'Deep Research', emoji: '🔬' })
    const updated = loadCollections()[0]
    expect(updated.name).toBe('Deep Research')
    expect(updated.emoji).toBe('🔬')
  })
  it('does not affect other collections', () => {
    const col2 = { ...mockCol, id: 'col-2', name: 'Auth' }
    saveCollections([mockCol, col2])
    updateCollection('col-1', { name: 'New Name' })
    expect(loadCollections()[1].name).toBe('Auth')
  })
})

describe('removeCollection', () => {
  it('removes collection by id', () => {
    saveCollections([mockCol])
    removeCollection('col-1')
    expect(loadCollections()).toEqual([])
  })
})

describe('getCollections', () => {
  it('returns all collections', () => {
    saveCollections([mockCol])
    expect(getCollections()).toEqual([mockCol])
  })
})

describe('createCollection', () => {
  it('sets id and createdAt automatically', () => {
    const col = createCollection({ name: 'Test', emoji: '🧪', source: 'manual' })
    expect(col.id).toBe('col-uuid-1234')
    expect(col.createdAt).toBeTruthy()
    expect(col.name).toBe('Test')
    expect(col.emoji).toBe('🧪')
    expect(col.source).toBe('manual')
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/lib/__tests__/saved-collections.test.ts
```

Expected: FAIL with "Cannot find module '../saved-collections'"

- [ ] **Step 3: Implement `src/lib/saved-collections.ts`**

```ts
import type { Collection } from '@/types/collection'

const STORAGE_KEY = 'drift-saved-collections'

export function loadCollections(): Collection[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Collection[]) : []
  } catch {
    return []
  }
}

export function saveCollections(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

export function getCollections(): Collection[] {
  return loadCollections()
}

export function addCollection(collection: Collection): void {
  saveCollections([...loadCollections(), collection])
}

export function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, 'name' | 'emoji'>>
): void {
  saveCollections(loadCollections().map(c => c.id === id ? { ...c, ...patch } : c))
}

export function removeCollection(id: string): void {
  saveCollections(loadCollections().filter(c => c.id !== id))
}

export function createCollection(
  partial: Pick<Collection, 'name' | 'emoji' | 'source'>
): Collection {
  return {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/__tests__/saved-collections.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/saved-collections.ts src/lib/__tests__/saved-collections.test.ts
git commit -m "feat: add saved-collections localStorage module with tests"
```

---

### Task 3: Add `updateLink` to `saved-links.ts`

**Files:**
- Modify: `src/lib/saved-links.ts`
- Modify: `src/lib/__tests__/saved-links.test.ts`

- [ ] **Step 1: Write the failing test**

Add this block to the end of `src/lib/__tests__/saved-links.test.ts`:

```ts
import { updateLink } from '../saved-links'

describe('updateLink', () => {
  it('updates note on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { note: 'great resource' })
    expect(loadLinks()[0].note).toBe('great resource')
  })
  it('updates collectionIds on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { collectionIds: ['col-1', 'col-2'] })
    expect(loadLinks()[0].collectionIds).toEqual(['col-1', 'col-2'])
  })
  it('updates tags on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { tags: ['react', 'auth'] })
    expect(loadLinks()[0].tags).toEqual(['react', 'auth'])
  })
  it('does not affect other links', () => {
    const other = { ...mockLink, id: 'other-1', note: '' }
    saveLinks([mockLink, other])
    updateLink('abc-123', { note: 'changed' })
    expect(loadLinks().find(l => l.id === 'other-1')?.note).toBe('')
  })
})
```

Note: you also need to add `updateLink` to the import at line 11:

```ts
import {
  loadLinks, saveLinks, addLink, updateLinkStatus,
  removeLink, archiveExpiredLinks, getActiveLinks, createSavedLink,
  updateLink,
} from '../saved-links'
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run src/lib/__tests__/saved-links.test.ts
```

Expected: FAIL — `updateLink` is not exported

- [ ] **Step 3: Add `updateLink` to `src/lib/saved-links.ts`**

Add this function after `updateLinkStatus`:

```ts
export function updateLink(
  id: string,
  patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>
): void {
  saveLinks(loadLinks().map(l => l.id === id ? { ...l, ...patch } : l))
}
```

- [ ] **Step 4: Run all saved-links tests**

```bash
npx vitest run src/lib/__tests__/saved-links.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/saved-links.ts src/lib/__tests__/saved-links.test.ts
git commit -m "feat: add updateLink for patching note/tags/collectionIds"
```

---

### Task 4: AI prompts for clustering and digest headline

**Files:**
- Modify: `src/lib/prompts.ts`
- Modify: `src/lib/__tests__/prompts.test.ts`

- [ ] **Step 1: Read the existing prompts test to understand the pattern**

```bash
cat src/lib/__tests__/prompts.test.ts
```

- [ ] **Step 2: Write failing tests**

Add to the end of `src/lib/__tests__/prompts.test.ts`:

```ts
import { linkClusterPrompt, linkDigestHeadlinePrompt } from '../prompts'

describe('linkClusterPrompt', () => {
  it('includes each link id and title in the output', () => {
    const links = [
      { id: 'a1', title: 'Auth guide', summary: 'How to auth' },
      { id: 'b2', title: 'JWT tutorial', summary: 'JWT basics' },
    ]
    const prompt = linkClusterPrompt(links)
    expect(prompt).toContain('[a1]')
    expect(prompt).toContain('Auth guide')
    expect(prompt).toContain('[b2]')
    expect(prompt).toContain('JWT tutorial')
  })
  it('asks for JSON with name and ids fields', () => {
    const prompt = linkClusterPrompt([{ id: 'x', title: 'T', summary: 'S' }])
    expect(prompt).toContain('"name"')
    expect(prompt).toContain('"ids"')
  })
})

describe('linkDigestHeadlinePrompt', () => {
  it('includes each link title in the output', () => {
    const links = [
      { title: 'Deep dive into RLS', summary: 'Row level security' },
      { title: 'OAuth PKCE flow', summary: 'PKCE explained' },
    ]
    const prompt = linkDigestHeadlinePrompt(links)
    expect(prompt).toContain('Deep dive into RLS')
    expect(prompt).toContain('OAuth PKCE flow')
  })
  it('asks for a single sentence', () => {
    const prompt = linkDigestHeadlinePrompt([{ title: 'T', summary: 'S' }])
    expect(prompt).toContain('single sentence')
  })
})
```

- [ ] **Step 3: Run to confirm tests fail**

```bash
npx vitest run src/lib/__tests__/prompts.test.ts
```

Expected: FAIL — `linkClusterPrompt` and `linkDigestHeadlinePrompt` are not exported

- [ ] **Step 4: Add the two prompt functions to `src/lib/prompts.ts`**

Append to the end of the file:

```ts
export function linkClusterPrompt(
  links: Array<{ id: string; title: string; summary: string }>
): string {
  const list = links
    .map((l, i) => `${i + 1}. [${l.id}] ${l.title} — ${l.summary}`)
    .join('\n')
  return `You are analysing a developer's saved link library to find thematic clusters.

Links:
${list}

Find the strongest cluster of 3 or more links that share a common theme.

Return a JSON object:
{
  "name": "<suggested collection name, 2-3 words, title case>",
  "ids": ["<link id>", ...]
}

If no clear cluster of 3+ links exists, return:
{ "name": null, "ids": [] }

Return ONLY the JSON object, no markdown fences`
}

export function linkDigestHeadlinePrompt(
  links: Array<{ title: string; summary: string }>
): string {
  const list = links
    .map((l, i) => `${i + 1}. ${l.title} — ${l.summary}`)
    .join('\n')
  return `You are summarising a developer's weekly saved links in a single sentence.

Links saved this week:
${list}

Write a single sentence (max 120 chars) describing the themes or topics they've been exploring. Be specific, not generic. No quotes around the sentence.

Return ONLY the sentence, no markdown, no trailing period`
}
```

- [ ] **Step 5: Run all prompt tests**

```bash
npx vitest run src/lib/__tests__/prompts.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompts.ts src/lib/__tests__/prompts.test.ts
git commit -m "feat: add linkClusterPrompt and linkDigestHeadlinePrompt"
```

---

### Task 5: `POST /api/links/cluster` route

**Files:**
- Create: `src/app/api/links/cluster/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkClusterPrompt } from '@/lib/prompts'

interface ClusterRequestBody {
  links: Array<{ id: string; title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { links } = await req.json() as ClusterRequestBody

    if (links.length < 3) {
      return NextResponse.json({ name: null, ids: [] })
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkClusterPrompt(links) }],
      response_format: { type: 'json_object' },
      max_tokens: 256,
    })

    const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
    return NextResponse.json({
      name: typeof raw.name === 'string' ? raw.name : null,
      ids: Array.isArray(raw.ids) ? raw.ids : [],
    })
  } catch {
    return NextResponse.json({ name: null, ids: [] })
  }
}
```

- [ ] **Step 2: Smoke-test by starting the dev server and posting to the route**

```bash
npx next dev
```

In a second terminal:

```bash
curl -X POST http://localhost:3000/api/links/cluster \
  -H "Content-Type: application/json" \
  -d '{"links":[{"id":"a","title":"Supabase RLS","summary":"Row level security"},{"id":"b","title":"JWT tokens","summary":"Auth tokens"},{"id":"c","title":"OAuth flows","summary":"OAuth2 guide"}]}'
```

Expected: `{"name":"...","ids":[...]}` or `{"name":null,"ids":[]}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/links/cluster/route.ts
git commit -m "feat: add /api/links/cluster route for AI collection suggestions"
```

---

### Task 6: `POST /api/links/digest` route

**Files:**
- Create: `src/app/api/links/digest/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkDigestHeadlinePrompt } from '@/lib/prompts'

interface DigestRequestBody {
  links: Array<{ title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { links } = await req.json() as DigestRequestBody

    if (links.length === 0) {
      return NextResponse.json({ headline: '' })
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkDigestHeadlinePrompt(links) }],
      max_tokens: 128,
    })

    const headline = completion.choices[0].message.content?.trim() ?? ''
    return NextResponse.json({ headline })
  } catch {
    return NextResponse.json({ headline: '' })
  }
}
```

- [ ] **Step 2: Smoke-test**

```bash
curl -X POST http://localhost:3000/api/links/digest \
  -H "Content-Type: application/json" \
  -d '{"links":[{"title":"Supabase RLS","summary":"Row level security guide"},{"title":"OAuth PKCE","summary":"PKCE flow explained"}]}'
```

Expected: `{"headline":"<one sentence>"}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/links/digest/route.ts
git commit -m "feat: add /api/links/digest route for weekly recap headline"
```

---

### Task 7: `CollectionBar` component

**Files:**
- Create: `src/components/links/collection-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/types/collection'

interface CollectionBarProps {
  collections: Collection[]
  active: string | null   // collection id; null = All
  onSelect: (id: string | null) => void
  onNew: (col: Collection) => void
}

export function CollectionBar({ collections, active, onSelect, onNew }: CollectionBarProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const col: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      emoji,
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
    onNew(col)
    setName('')
    setEmoji('📁')
    setCreating(false)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200 font-medium',
          active === null
            ? 'bg-drift-accent text-[#0a0f1a]'
            : 'bg-white/[0.05] border border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary'
        )}
      >
        All
      </button>

      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => onSelect(col.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200',
            active === col.id
              ? 'bg-drift-accent/15 border border-drift-accent/30 text-drift-accent'
              : 'bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
          )}
        >
          <span>{col.emoji}</span>
          <span>{col.name}</span>
        </button>
      ))}

      {creating ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-drift-accent/30 bg-drift-accent/[0.06] shrink-0">
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-5 bg-transparent text-center outline-none text-label"
            maxLength={2}
          />
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Name"
            className="bg-transparent text-label text-drift-text-primary outline-none placeholder:text-drift-text-tertiary w-20"
          />
          <button onClick={handleCreate} className="text-label text-drift-accent font-medium">
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-full text-label shrink-0 border border-dashed border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary transition-all duration-200"
        >
          + New
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Visually verify** — import in Drop page temporarily and check it renders. (Full wiring in Task 12.)

- [ ] **Step 3: Commit**

```bash
git add src/components/links/collection-bar.tsx
git commit -m "feat: add CollectionBar pill filter component"
```

---

### Task 8: `CollectionPicker` component

Used in both the inline expand (Task 9) and the assign sheet.

**Files:**
- Create: `src/components/links/collection-picker.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/types/collection'

interface CollectionPickerProps {
  selected: string[]
  collections: Collection[]
  onToggle: (id: string) => void
  onNew: (collection: Collection) => void
}

export function CollectionPicker({
  selected,
  collections,
  onToggle,
  onNew,
}: CollectionPickerProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const col: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      emoji,
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
    onNew(col)
    setName('')
    setEmoji('📁')
    setCreating(false)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => onToggle(col.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label border transition-all duration-200',
            selected.includes(col.id)
              ? 'bg-drift-accent/15 border-drift-accent/40 text-drift-accent'
              : 'bg-white/[0.04] border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
          )}
        >
          <span>{col.emoji}</span>
          <span>{col.name}</span>
        </button>
      ))}

      {creating ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-drift-accent/30 bg-drift-accent/[0.06]">
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-6 bg-transparent text-center outline-none text-body"
            maxLength={2}
          />
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Name"
            className="bg-transparent text-label text-drift-text-primary outline-none placeholder:text-drift-text-tertiary w-24"
          />
          <button
            onClick={handleCreate}
            className="text-label text-drift-accent font-medium"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-xl text-label border border-dashed border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary transition-all duration-200"
        >
          + New
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/collection-picker.tsx
git commit -m "feat: add CollectionPicker shared component"
```

---

### Task 9: Update `LinkCard` with note display, collection badge, assign action, and inline expand

**Files:**
- Modify: `src/components/links/link-card.tsx`

- [ ] **Step 1: Read the current `LinkCard` before editing**

```bash
cat src/components/links/link-card.tsx
```

- [ ] **Step 2: Replace `src/components/links/link-card.tsx` with the updated version**

```tsx
'use client'

import { useState } from 'react'
import { Check, Bookmark, Trash2, FolderPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'
import { CollectionPicker } from '@/components/links/collection-picker'

const TYPE_GLYPH: Record<string, string> = {
  video:   '▶',
  repo:    '⌥',
  tweet:   '𝕏',
  article: '∥',
  other:   '◈',
}

const TYPE_GLYPH_COLOR: Record<string, string> = {
  video:   'text-violet-600/80',
  repo:    'text-sky-700/80',
  tweet:   'text-sky-600/80',
  article: 'text-amber-800/70',
  other:   'text-drift-card-warm-body/50',
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
  collections: Collection[]
  isExpanded?: boolean
  onRead: () => void
  onKeep: () => void
  onRemove: () => void
  onUpdateLink: (patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>) => void
  onCollectionCreated: (col: Collection) => void
}

export function LinkCard({
  link,
  collections,
  isExpanded = false,
  onRead,
  onKeep,
  onRemove,
  onUpdateLink,
  onCollectionCreated,
}: LinkCardProps) {
  const isRead = link.status === 'read'
  const isKept = link.status === 'kept'
  const [showAssign, setShowAssign] = useState(false)
  const [note, setNote] = useState(link.note)

  const primaryCollection = collections.find(c => link.collectionIds.includes(c.id))

  const handleNoteBlur = () => {
    if (note !== link.note) onUpdateLink({ note })
  }

  const handleCollectionToggle = (id: string) => {
    const next = link.collectionIds.includes(id)
      ? link.collectionIds.filter(c => c !== id)
      : [...link.collectionIds, id]
    onUpdateLink({ collectionIds: next })
  }

  const handleCollectionCreated = (col: Collection) => {
    onCollectionCreated(col)
    onUpdateLink({ collectionIds: [...link.collectionIds, col.id] })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isRead ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      whileHover={{ scale: 1.012, boxShadow: '0 8px 32px rgba(61,53,48,0.14)' }}
      transition={{ duration: 0.2, type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'relative rounded-2xl overflow-hidden border',
        'bg-drift-card-warm-bg',
        isKept
          ? 'border-drift-card-warm-accent/40'
          : 'border-drift-card-warm-border'
      )}
    >
      {isKept && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-drift-card-warm-accent/80 via-drift-card-warm-accent/50 to-drift-card-warm-accent/20" />
      )}

      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {link.favicon ? (
            <img
              src={link.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className={cn('text-xs', TYPE_GLYPH_COLOR[link.type] ?? 'text-drift-card-warm-body/60')}>
              {TYPE_GLYPH[link.type] ?? '◈'}
            </span>
          )}
          <span className="text-label text-drift-card-warm-body truncate max-w-[140px]">
            {link.siteName}
          </span>
          <span className="text-drift-card-warm-body/40 text-xs shrink-0">·</span>
          <span className="text-label text-drift-card-warm-body/60 shrink-0">{formatAge(link.savedAt)}</span>

          {primaryCollection && (
            <span className="ml-auto text-[10px] font-medium text-drift-accent/80 bg-drift-accent/[0.08] border border-drift-accent/[0.15] px-1.5 py-0.5 rounded-md shrink-0">
              {primaryCollection.emoji} {primaryCollection.name}
            </span>
          )}
          {!primaryCollection && isKept && (
            <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-drift-card-warm-accent/80">
              Saved
            </span>
          )}
        </div>

        {/* Title + summary + thumbnail */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'block text-lg font-semibold leading-snug mb-1.5',
                'text-drift-card-warm-title hover:text-drift-card-warm-accent transition-colors duration-150',
                'line-clamp-2',
                isRead && 'line-through opacity-50'
              )}
            >
              {link.title}
            </a>

            {/* Note */}
            {link.note && !isExpanded && (
              <p className="text-label text-drift-card-warm-body/70 italic mb-1.5 pl-2.5 border-l-2 border-drift-accent/25">
                {link.note}
              </p>
            )}

            {link.summary && (
              <p className="text-md text-drift-card-warm-body line-clamp-2 leading-relaxed font-normal">
                {link.summary}
              </p>
            )}
          </div>

          {link.thumbnail && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-[100px] h-[80px] rounded-lg overflow-hidden block mt-0.5 bg-drift-card-warm-border"
            >
              <img
                src={link.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </a>
          )}
        </div>

        {/* Inline expand area — shown when isExpanded or showAssign */}
        <AnimatePresence>
          {(isExpanded || showAssign) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-drift-card-warm-border/60 space-y-3">
                {/* Note field */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-card-warm-body/40 mb-1.5">
                    Note
                  </p>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onBlur={handleNoteBlur}
                    placeholder="Why are you saving this?"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-label text-drift-card-warm-body placeholder:text-drift-card-warm-body/30 outline-none focus:border-drift-accent/30 transition-colors duration-200"
                  />
                </div>

                {/* Collection picker */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-card-warm-body/40 mb-1.5">
                    Collection
                  </p>
                  <CollectionPicker
                    selected={link.collectionIds}
                    collections={collections}
                    onToggle={handleCollectionToggle}
                    onNew={handleCollectionCreated}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions row */}
        <div className="mt-3.5 pt-3 border-t border-drift-card-warm-border flex items-center justify-end gap-2">
          {/* Assign to collection */}
          <button
            onClick={() => setShowAssign(v => !v)}
            title="Add to collection"
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200',
              showAssign || link.collectionIds.length > 0
                ? 'bg-drift-accent/15 border-drift-accent/40 text-drift-accent'
                : 'bg-drift-card-warm-title/5 border-drift-card-warm-border text-drift-card-warm-body hover:bg-drift-accent/10 hover:border-drift-accent/30 hover:text-drift-accent'
            )}
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>

          {/* Read */}
          <button
            onClick={onRead}
            title="Mark as read"
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200',
              isRead
                ? 'bg-emerald-500/20 border-emerald-600/40 text-emerald-700'
                : 'bg-drift-card-warm-title/5 border-drift-card-warm-border text-drift-card-warm-body hover:bg-emerald-500/15 hover:border-emerald-600/35 hover:text-emerald-700'
            )}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          {/* Keep */}
          <button
            onClick={onKeep}
            title="Keep — won't auto-archive"
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200',
              isKept
                ? 'bg-drift-card-warm-accent/15 border-drift-card-warm-accent/50 text-drift-card-warm-accent'
                : 'bg-drift-card-warm-title/5 border-drift-card-warm-border text-drift-card-warm-body hover:bg-drift-card-warm-accent/10 hover:border-drift-card-warm-accent/40 hover:text-drift-card-warm-accent'
            )}
          >
            <Bookmark
              className={cn('w-3.5 h-3.5', isKept && 'fill-current')}
              strokeWidth={isKept ? 0 : 1.5}
            />
          </button>

          {/* Remove */}
          <button
            onClick={onRemove}
            title="Remove"
            className="w-8 h-8 rounded-xl flex items-center justify-center border bg-drift-card-warm-title/5 border-drift-card-warm-border text-drift-card-warm-body hover:bg-red-500/15 hover:border-red-400/40 hover:text-red-600 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Run the dev server and visually verify a link card renders without errors**

```bash
npx next dev
```

Open http://localhost:3000 in browser, navigate to Drop tab. Confirm link cards still render.

- [ ] **Step 4: Commit**

```bash
git add src/components/links/link-card.tsx
git commit -m "feat: update LinkCard with note, collection badge, assign action, inline expand"
```

---

### Task 10: `ClusterNudge` component

**Files:**
- Create: `src/components/links/cluster-nudge.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { X } from 'lucide-react'

interface ClusterNudgeProps {
  suggestion: { name: string; ids: string[] }
  onAccept: (name: string, ids: string[]) => void
  onDismiss: () => void
}

export function ClusterNudge({ suggestion, onAccept, onDismiss }: ClusterNudgeProps) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-drift-accent/[0.06] border border-drift-accent/[0.18] rounded-xl">
      <span className="text-drift-accent text-xs shrink-0">✦</span>
      <p className="flex-1 text-label text-drift-text-secondary">
        {suggestion.ids.length} links look like &ldquo;{suggestion.name}&rdquo; — create collection?
      </p>
      <button
        onClick={() => onAccept(suggestion.name, suggestion.ids)}
        className="text-label text-drift-accent font-medium shrink-0 hover:text-drift-accent/80 transition-colors duration-150"
      >
        Create →
      </button>
      <button
        onClick={onDismiss}
        className="text-drift-text-tertiary shrink-0 hover:text-drift-text-secondary transition-colors duration-150"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/cluster-nudge.tsx
git commit -m "feat: add ClusterNudge component for AI collection suggestions"
```

---

### Task 11: `WeeklyDigestBanner` component

**Files:**
- Create: `src/components/links/weekly-digest-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'

const DISMISS_KEY = 'drift-digest-dismissed-at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MIN_LINKS = 7

interface WeeklyDigestBannerProps {
  links: SavedLink[]
  collections: Collection[]
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

function getRecentLinks(links: SavedLink[]): SavedLink[] {
  const cutoff = Date.now() - WEEK_MS
  return links.filter(l => new Date(l.savedAt).getTime() > cutoff)
}

export function WeeklyDigestBanner({ links, collections }: WeeklyDigestBannerProps) {
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [headline, setHeadline] = useState('')

  const recentLinks = getRecentLinks(links)
  const unread = recentLinks.filter(l => l.status === 'active')
  const usedCollectionIds = new Set(recentLinks.flatMap(l => l.collectionIds))
  const usedCollections = collections.filter(c => usedCollectionIds.has(c.id))

  useEffect(() => {
    if (recentLinks.length >= MIN_LINKS && !isDismissed()) {
      setVisible(true)
    }
  }, [recentLinks.length])

  useEffect(() => {
    if (!sheetOpen || headline) return
    const payload = recentLinks.map(l => ({ title: l.title, summary: l.summary }))
    fetch('/api/links/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: payload }),
    })
      .then(r => r.json())
      .then((d: { headline: string }) => { if (d.headline) setHeadline(d.headline) })
      .catch(() => { /* silent fail */ })
  }, [sheetOpen])

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  // Group recent links by collection for the sheet
  const byCollection: Array<{ collection: Collection | null; links: SavedLink[] }> = []
  const assigned = new Set<string>()

  for (const col of usedCollections) {
    const colLinks = recentLinks.filter(l => l.collectionIds.includes(col.id))
    if (colLinks.length > 0) {
      byCollection.push({ collection: col, links: colLinks })
      colLinks.forEach(l => assigned.add(l.id))
    }
  }

  const uncollected = recentLinks.filter(l => !assigned.has(l.id))
  if (uncollected.length > 0) {
    byCollection.push({ collection: null, links: uncollected })
  }

  if (!visible) return null

  return (
    <>
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-3.5 py-3 bg-drift-accent/[0.06] border border-drift-accent/[0.15] rounded-2xl cursor-pointer"
        onClick={() => setSheetOpen(true)}
      >
        <BarChart2 className="w-4 h-4 text-drift-accent shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-drift-accent leading-tight">This week&rsquo;s recap</p>
          <p className="text-label text-drift-text-tertiary mt-0.5">
            {recentLinks.length} saved · {unread.length} unread
            {usedCollections.length > 0 && ` · ${usedCollections.length} collection${usedCollections.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-drift-accent/60 shrink-0" strokeWidth={1.5} />
        <button
          onClick={e => { e.stopPropagation(); handleDismiss() }}
          className="text-drift-text-tertiary hover:text-drift-text-secondary transition-colors duration-150 shrink-0"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </motion.div>

      {/* Full digest sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1424] border-t border-white/[0.08] rounded-t-2xl px-5 pt-5 pb-10 max-h-[80vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="w-8 h-1 bg-white/[0.12] rounded-full mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-text-tertiary mb-1">
                    Week recap
                  </p>
                  <h3 className="text-body font-semibold text-drift-text-primary leading-snug">
                    {recentLinks.length} links saved, {unread.length} unread
                  </h3>
                  {headline && (
                    <p className="text-body-sm text-drift-text-secondary mt-1.5 leading-relaxed">
                      {headline}
                    </p>
                  )}
                  {!headline && (
                    <div className="h-4 w-3/4 bg-white/[0.06] rounded animate-pulse mt-1.5" />
                  )}
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-drift-text-tertiary hover:text-drift-text-secondary transition-colors ml-3 shrink-0"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Per-collection sections */}
              <div className="space-y-5 mt-5">
                {byCollection.map(({ collection, links: colLinks }) => (
                  <div key={collection?.id ?? '__uncollected__'}>
                    <p className="text-label font-semibold text-drift-text-secondary mb-2.5">
                      {collection ? `${collection.emoji} ${collection.name}` : 'Other'}
                      <span className="text-drift-text-tertiary font-normal ml-1.5">
                        {colLinks.length} link{colLinks.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                    <div className="space-y-2">
                      {colLinks.map(l => (
                        <div key={l.id} className="flex items-start gap-2.5">
                          <div className="w-1 h-1 rounded-full bg-drift-accent/40 mt-2 shrink-0" />
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-label text-drift-card-warm-title hover:text-drift-accent transition-colors duration-150 leading-relaxed"
                          >
                            {l.title}
                          </a>
                          {l.status === 'active' && (
                            <span className="text-[10px] text-drift-text-tertiary shrink-0 mt-0.5">unread</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/links/weekly-digest-banner.tsx
git commit -m "feat: add WeeklyDigestBanner with AI headline and per-collection digest sheet"
```

---

### Task 12: Wire up `drop/page.tsx`

**Files:**
- Modify: `src/app/(app)/drop/page.tsx`

- [ ] **Step 1: Read the current Drop page before editing**

```bash
cat src/app/\(app\)/drop/page.tsx
```

- [ ] **Step 2: Replace `src/app/(app)/drop/page.tsx` with the wired-up version**

```tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import {
  loadLinks,
  addLink,
  updateLinkStatus,
  updateLink,
  removeLink,
  getActiveLinks,
  archiveExpiredLinks,
  createSavedLink,
} from '@/lib/saved-links'
import {
  getCollections,
  addCollection,
  createCollection,
} from '@/lib/saved-collections'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'
import { logActivity } from '@/lib/activity-log'
import { ContextBar } from '@/components/links/context-bar'
import { TagFilter } from '@/components/links/tag-filter'
import { LinkCard } from '@/components/links/link-card'
import { CollectionBar } from '@/components/links/collection-bar'
import { ClusterNudge } from '@/components/links/cluster-nudge'
import { WeeklyDigestBanner } from '@/components/links/weekly-digest-banner'

async function scoreLinks(
  context: string,
  links: SavedLink[]
): Promise<Map<string, number>> {
  if (!context || links.length === 0) return new Map()
  try {
    const res = await fetch('/api/links/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        links: links.map(l => ({ id: l.id, title: l.title, summary: l.summary })),
      }),
    })
    if (!res.ok) return new Map()
    const data = await res.json() as { id: string; score: number }[]
    return new Map(data.map(d => [d.id, d.score]))
  } catch {
    return new Map()
  }
}

async function fetchClusterSuggestion(
  links: SavedLink[]
): Promise<{ name: string; ids: string[] } | null> {
  const uncollected = links.filter(l => l.collectionIds.length === 0)
  if (uncollected.length < 3) return null
  try {
    const res = await fetch('/api/links/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        links: uncollected.map(l => ({ id: l.id, title: l.title, summary: l.summary })),
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { name: string | null; ids: string[] }
    if (!data.name || data.ids.length < 3) return null
    return { name: data.name, ids: data.ids }
  } catch {
    return null
  }
}

export default function DropPage() {
  const { profile } = useProfile()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [context, setContext] = useState('')
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [scoringContext, setScoringContext] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [clusterSuggestion, setClusterSuggestion] = useState<{ name: string; ids: string[] } | null>(null)
  const [clusterDismissed, setClusterDismissed] = useState(false)

  // Load links, collections, archive expired on mount
  useEffect(() => {
    archiveExpiredLinks()
    setLinks(getActiveLinks())
    setCollections(getCollections())
  }, [])

  // Initialise context from profile
  useEffect(() => {
    if (profile?.currentContext && !context) {
      setContext(profile.currentContext)
    }
  }, [profile, context])

  // Auto-collapse expanded card after 8 seconds
  useEffect(() => {
    if (!expandedId) return
    const timer = setTimeout(() => setExpandedId(null), 8000)
    return () => clearTimeout(timer)
  }, [expandedId])

  // Re-score when context changes (debounced)
  useEffect(() => {
    if (!context || context === scoringContext) return
    const timer = setTimeout(async () => {
      const active = getActiveLinks()
      const map = await scoreLinks(context, active)
      setScores(map)
      setScoringContext(context)
    }, 800)
    return () => clearTimeout(timer)
  }, [context, scoringContext])

  // Run cluster check lazily after links settle (debounced, once per session)
  useEffect(() => {
    if (clusterDismissed || clusterSuggestion) return
    const active = getActiveLinks()
    if (active.length < 3) return
    const timer = setTimeout(async () => {
      const suggestion = await fetchClusterSuggestion(active)
      if (suggestion) setClusterSuggestion(suggestion)
    }, 2000)
    return () => clearTimeout(timer)
  }, [links, clusterDismissed, clusterSuggestion])

  const handleSave = useCallback(async (url: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const meta = res.ok ? await res.json() : {}
      const link = createSavedLink({
        url,
        title: meta.title ?? url,
        summary: meta.summary ?? '',
        thumbnail: meta.thumbnail ?? null,
        favicon: meta.favicon ?? null,
        siteName: meta.siteName ?? new URL(url).hostname,
        type: meta.type ?? 'other',
        tags: meta.tags ?? [],
        source: 'manual',
      })
      addLink(link)
      logActivity('link_saved')
      setLinks(getActiveLinks())
      setExpandedId(link.id)
      if (context) {
        const map = await scoreLinks(context, getActiveLinks())
        setScores(map)
        setScoringContext(context)
      }
    } finally {
      setIsSaving(false)
    }
  }, [context])

  const handleSubmit = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed || isSaving) return
    try { new URL(trimmed) } catch {
      setUrlError('Enter a valid URL (e.g. https://example.com)')
      return
    }
    setUrlError('')
    setUrlInput('')
    handleSave(trimmed)
  }, [urlInput, isSaving, handleSave])

  const handleStatus = useCallback((id: string, status: SavedLink['status']) => {
    updateLinkStatus(id, status)
    if (status === 'read') logActivity('link_read')
    else if (status === 'kept') logActivity('link_kept')
    setLinks(getActiveLinks())
  }, [])

  const handleRemove = useCallback((id: string) => {
    removeLink(id)
    logActivity('link_removed')
    setLinks(getActiveLinks())
  }, [])

  const handleUpdateLink = useCallback((
    id: string,
    patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>
  ) => {
    updateLink(id, patch)
    setLinks(getActiveLinks())
  }, [])

  const handleCollectionCreated = useCallback((col: Collection) => {
    addCollection(col)
    setCollections(getCollections())
  }, [])

  const handleNewCollection = useCallback((col: Collection) => {
    addCollection(col)
    setCollections(getCollections())
    setActiveCollection(col.id)
  }, [])

  const handleAcceptCluster = useCallback((name: string, ids: string[]) => {
    const col = createCollection({ name, emoji: '✦', source: 'ai-suggested' })
    addCollection(col)
    ids.forEach(id => {
      const link = getActiveLinks().find(l => l.id === id)
      if (link) updateLink(id, { collectionIds: [...link.collectionIds, col.id] })
    })
    setCollections(getCollections())
    setLinks(getActiveLinks())
    setClusterSuggestion(null)
  }, [])

  const allTypes = useMemo(
    () => Array.from(new Set(links.map(l => l.type))),
    [links]
  )

  const toggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const filtered = useMemo(() => {
    let result = links
    if (activeCollection) {
      result = result.filter(l => l.collectionIds.includes(activeCollection))
    }
    if (activeTypes.length > 0) {
      result = result.filter(l => activeTypes.includes(l.type))
    }
    return result
  }, [links, activeCollection, activeTypes])

  const relevant = filtered.filter(l => (scores.get(l.id) ?? 0) >= 6)
  const other = filtered.filter(l => (scores.get(l.id) ?? 0) < 6)

  const expiringIds = useMemo(() => {
    const threshold = Date.now() + 24 * 60 * 60 * 1000
    return new Set(
      links
        .filter(l => l.status === 'active' && new Date(l.expiresAt).getTime() < threshold)
        .map(l => l.id)
    )
  }, [links])

  const hasScores = scores.size > 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-h1 text-drift-text-primary leading-none">Drop</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-1.5">
          Your personal link library.
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Controls zone */}
      <div className="space-y-3">
        <ContextBar value={context} onChange={setContext} />

        {/* URL input */}
        <motion.div
          animate={{
            boxShadow: isSaving
              ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
              : '0 0 0 1px rgba(255,255,255,0.06)',
          }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-[#111827] overflow-hidden"
        >
          <div className={cn('flex items-center gap-3 px-4 py-3.5', isSaving && 'opacity-60 pointer-events-none')}>
            <Link2 className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
            <input
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="Paste a URL to save..."
              className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
            />
            <AnimatePresence>
              {urlInput.trim() && !isSaving && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
                >
                  Save
                  <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {urlError && (
            <p className="px-4 pb-3 text-label text-red-400">{urlError}</p>
          )}
        </motion.div>

        {/* Collection pill bar */}
        {(collections.length > 0 || links.length > 0) && (
          <CollectionBar
            collections={collections}
            active={activeCollection}
            onSelect={setActiveCollection}
            onNew={handleNewCollection}
          />
        )}

        {/* Type filter */}
        {allTypes.length > 0 && (
          <TagFilter
            tags={allTypes}
            active={activeTypes}
            onToggle={toggleType}
            onClear={() => setActiveTypes([])}
          />
        )}

        {/* Expiry nudge */}
        {expiringIds.size > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
            <span className="text-label text-amber-400">
              {expiringIds.size === 1
                ? '1 link expires within 24 hours'
                : `${expiringIds.size} links expire within 24 hours`}
              {' — '}bookmark to keep them.
            </span>
          </div>
        )}

        {/* Weekly digest banner */}
        <WeeklyDigestBanner links={links} collections={collections} />

        {/* AI cluster nudge */}
        {clusterSuggestion && !clusterDismissed && (
          <ClusterNudge
            suggestion={clusterSuggestion}
            onAccept={handleAcceptCluster}
            onDismiss={() => { setClusterDismissed(true); setClusterSuggestion(null) }}
          />
        )}
      </div>

      {/* Skeleton while saving */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex gap-3 items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="w-[60px] h-[44px] rounded-lg bg-white/[0.06] shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-white/[0.06] w-3/4 animate-pulse" />
              <div className="h-2.5 rounded bg-white/[0.04] w-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link sections */}
      {filtered.length === 0 && !isSaving ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          {links.length === 0 ? (
            <>
              <p className="text-body text-drift-text-secondary mb-1">No links saved yet.</p>
              <p className="text-body-sm text-drift-text-tertiary">
                Tap + to save your first link.
              </p>
            </>
          ) : (
            <p className="text-body text-drift-text-secondary">No links match these filters.</p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          {hasScores && relevant.length > 0 && (
            <section className="space-y-3">
              <p className="text-label text-drift-accent/60 px-0.5">Relevant to you now</p>
              <AnimatePresence mode="popLayout">
                {relevant.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    collections={collections}
                    isExpanded={expandedId === link.id}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                    onUpdateLink={patch => handleUpdateLink(link.id, patch)}
                    onCollectionCreated={handleCollectionCreated}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {(other.length > 0 || !hasScores) && (
            <section className="space-y-3">
              {hasScores && relevant.length > 0 && other.length > 0 && (
                <p className="text-label text-drift-text-tertiary px-0.5">Other saved</p>
              )}
              <AnimatePresence mode="popLayout">
                {(hasScores ? other : filtered).map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    collections={collections}
                    isExpanded={expandedId === link.id}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                    onUpdateLink={patch => handleUpdateLink(link.id, patch)}
                    onCollectionCreated={handleCollectionCreated}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Start dev server and do a full manual walkthrough**

```bash
npx next dev
```

Checklist:
- [ ] Paste a URL — link saves, card expands inline with note/collection fields
- [ ] Type a note, blur out — note persists on page reload
- [ ] Create a new collection via "+ New" in the collection bar
- [ ] Assign a link to a collection via the ⊕ action button
- [ ] Filter by collection — only matching links shown
- [ ] With 7+ links saved in the past 7 days, the digest banner appears
- [ ] Tapping the banner opens the digest sheet with per-collection breakdown
- [ ] AI headline loads in the sheet
- [ ] AI cluster nudge appears (may take a moment — check devtools network tab for `/api/links/cluster` call)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/drop/page.tsx
git commit -m "feat: wire up Drop tab with collections, cluster nudge, and weekly digest"
```

---

### Final: Run full test suite

- [ ] **Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Final commit if any loose files**

```bash
git status
# stage and commit any remaining untracked files
```
