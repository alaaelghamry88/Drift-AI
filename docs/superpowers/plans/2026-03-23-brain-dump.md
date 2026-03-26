# Brain Dump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dump` screen to Drift — a draggable, persistent canvas of sticky notes and to-do cards where developers can offload mental clutter.

**Architecture:** Types and localStorage helpers are isolated in `src/types/brain-dump.ts` and `src/lib/brain-dump.ts`. UI is split into focused components: `color-swatch.tsx`, `sticky-note.tsx`, `todo-card.tsx`, `add-sheet.tsx`, and `brain-dump-canvas.tsx`. The page (`dump/page.tsx`) is a thin shell that loads entries and renders the canvas. Drag is handled with native pointer events on each card — no library needed.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion (`motion`, `AnimatePresence`), lucide-react, vitest (jsdom) for tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/types/brain-dump.ts` | `NoteEntry`, `TodoEntry`, `BrainDumpEntry` interfaces |
| Create | `src/lib/brain-dump.ts` | localStorage helpers — narrowed update functions |
| Create | `src/lib/__tests__/brain-dump.test.ts` | Unit tests for all helpers |
| Create | `src/components/dump/color-swatch.tsx` | Single color swatch button (creation sheet only) |
| Create | `src/components/dump/sticky-note.tsx` | Sticky note card: drag, delete, fold-corner |
| Create | `src/components/dump/todo-card.tsx` | To-do card: drag, checkboxes, inline edit, delete |
| Create | `src/components/dump/add-sheet.tsx` | Bottom sheet creation flow (type → color → write) |
| Create | `src/components/dump/brain-dump-canvas.tsx` | Canvas wrapper, ResizeObserver, AnimatePresence |
| Create | `src/app/(app)/dump/page.tsx` | Page shell — loads entries, renders canvas + FAB |
| Modify | `src/components/ui/bottom-nav.tsx` | Add Dump nav item, adjust padding, rename Profile → Me |

---

## Task 1: Types

**Files:**
- Create: `src/types/brain-dump.ts`

- [ ] **Step 1: Create the type file**

```ts
// src/types/brain-dump.ts

export interface NoteEntry {
  id: string
  type: 'note'
  color: string       // hex e.g. '#f5c842'
  text: string
  x: number
  y: number
  rotation: number    // degrees, –3 to +3, fixed at creation
  createdAt: number   // unix ms
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface TodoEntry {
  id: string
  type: 'todo'
  title: string
  items: TodoItem[]
  x: number
  y: number
  rotation: number    // always 0
  createdAt: number
}

export type BrainDumpEntry = NoteEntry | TodoEntry
```

- [ ] **Step 2: Commit**

```bash
git add src/types/brain-dump.ts
git commit -m "feat: add BrainDumpEntry types"
```

---

## Task 2: localStorage Helpers + Tests

**Files:**
- Create: `src/lib/brain-dump.ts`
- Create: `src/lib/__tests__/brain-dump.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/brain-dump.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadEntries,
  saveEntries,
  addEntry,
  deleteEntry,
  updateNotePosition,
  updateNoteText,
  updateTodoPosition,
  updateTodoTitle,
  updateTodoItem,
  addTodoItem,
} from '../brain-dump'
import type { NoteEntry, TodoEntry } from '@/types/brain-dump'

const NOTE: NoteEntry = {
  id: 'n1', type: 'note', color: '#f5c842', text: 'Hello', x: 10, y: 20, rotation: -1, createdAt: 1000,
}
const TODO: TodoEntry = {
  id: 't1', type: 'todo', title: 'My list', items: [{ id: 'i1', text: 'Do thing', done: false }],
  x: 50, y: 60, rotation: 0, createdAt: 2000,
}

describe('loadEntries', () => {
  beforeEach(() => localStorage.clear())
  it('returns [] when nothing stored', () => expect(loadEntries()).toEqual([]))
  it('returns parsed entries', () => {
    localStorage.setItem('drift-brain-dump', JSON.stringify([NOTE]))
    expect(loadEntries()).toEqual([NOTE])
  })
  it('returns [] on invalid JSON', () => {
    localStorage.setItem('drift-brain-dump', '{bad')
    expect(loadEntries()).toEqual([])
  })
})

describe('addEntry', () => {
  beforeEach(() => localStorage.clear())
  it('appends a new entry', () => {
    addEntry(NOTE)
    expect(loadEntries()).toEqual([NOTE])
  })
  it('preserves existing entries', () => {
    addEntry(NOTE)
    addEntry(TODO)
    expect(loadEntries()).toHaveLength(2)
  })
})

describe('deleteEntry', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE, TODO]) })
  it('removes the entry by id', () => {
    deleteEntry('n1')
    expect(loadEntries()).toEqual([TODO])
  })
  it('is a no-op for unknown id', () => {
    deleteEntry('nope')
    expect(loadEntries()).toHaveLength(2)
  })
})

describe('updateNotePosition', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE]) })
  it('updates x and y', () => {
    updateNotePosition('n1', 99, 88)
    expect(loadEntries()[0]).toMatchObject({ x: 99, y: 88 })
  })
})

describe('updateNoteText', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE]) })
  it('updates text', () => {
    updateNoteText('n1', 'Updated')
    const entry = loadEntries()[0] as NoteEntry
    expect(entry.text).toBe('Updated')
  })
})

describe('updateTodoPosition', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('updates x and y', () => {
    updateTodoPosition('t1', 11, 22)
    expect(loadEntries()[0]).toMatchObject({ x: 11, y: 22 })
  })
})

describe('updateTodoTitle', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('updates title', () => {
    updateTodoTitle('t1', 'New title')
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.title).toBe('New title')
  })
})

describe('updateTodoItem', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('toggles done', () => {
    updateTodoItem('t1', 'i1', { done: true })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items[0].done).toBe(true)
  })
  it('updates text', () => {
    updateTodoItem('t1', 'i1', { text: 'Changed' })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items[0].text).toBe('Changed')
  })
})

describe('addTodoItem', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('appends a new item', () => {
    addTodoItem('t1', { id: 'i2', text: 'New item', done: false })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items).toHaveLength(2)
    expect(entry.items[1].text).toBe('New item')
  })
})
```

- [ ] **Step 2: Run tests — expect them to FAIL (module not found)**

```bash
npx vitest run src/lib/__tests__/brain-dump.test.ts
```

Expected: FAIL — `Cannot find module '../brain-dump'`

- [ ] **Step 3: Implement `src/lib/brain-dump.ts`**

```ts
// src/lib/brain-dump.ts
import type { BrainDumpEntry, NoteEntry, TodoEntry, TodoItem } from '@/types/brain-dump'

const KEY = 'drift-brain-dump'

export function loadEntries(): BrainDumpEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BrainDumpEntry[]) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: BrainDumpEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage unavailable
  }
}

export function addEntry(entry: BrainDumpEntry): void {
  saveEntries([...loadEntries(), entry])
}

export function deleteEntry(id: string): void {
  saveEntries(loadEntries().filter(e => e.id !== id))
}

export function updateNotePosition(id: string, x: number, y: number): void {
  saveEntries(loadEntries().map(e =>
    e.id === id && e.type === 'note' ? { ...e, x, y } : e
  ))
}

export function updateNoteText(id: string, text: string): void {
  saveEntries(loadEntries().map(e =>
    e.id === id && e.type === 'note' ? { ...e, text } : e
  ))
}

export function updateTodoPosition(id: string, x: number, y: number): void {
  saveEntries(loadEntries().map(e =>
    e.id === id && e.type === 'todo' ? { ...e, x, y } : e
  ))
}

export function updateTodoTitle(id: string, title: string): void {
  saveEntries(loadEntries().map(e =>
    e.id === id && e.type === 'todo' ? { ...e, title } : e
  ))
}

export function updateTodoItem(
  id: string,
  itemId: string,
  patch: { text?: string; done?: boolean }
): void {
  saveEntries(loadEntries().map(e => {
    if (e.id !== id || e.type !== 'todo') return e
    return {
      ...e,
      items: (e as TodoEntry).items.map(item =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    }
  }))
}

export function addTodoItem(id: string, item: TodoItem): void {
  saveEntries(loadEntries().map(e => {
    if (e.id !== id || e.type !== 'todo') return e
    return { ...e, items: [...(e as TodoEntry).items, item] }
  }))
}
```

- [ ] **Step 4: Run tests — expect all to PASS**

```bash
npx vitest run src/lib/__tests__/brain-dump.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/brain-dump.ts src/lib/__tests__/brain-dump.test.ts
git commit -m "feat: add brain dump localStorage helpers with tests"
```

---

## Task 3: ColorSwatch Component

**Files:**
- Create: `src/components/dump/color-swatch.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dump/color-swatch.tsx
'use client'

interface ColorSwatchProps {
  color: string
  active: boolean
  onClick: () => void
}

export function ColorSwatch({ color, active, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: color }}
      className={`
        w-7 h-7 rounded-full transition-transform duration-150 shadow-md
        ${active
          ? 'scale-110 ring-2 ring-white/40 ring-offset-2 ring-offset-[#12131e]'
          : 'hover:scale-115'
        }
      `}
      aria-label={`Select color ${color}`}
    >
      {active && (
        <span className="flex items-center justify-center w-full h-full text-black/50 text-[11px] font-bold">
          ✓
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dump/color-swatch.tsx
git commit -m "feat: add ColorSwatch component"
```

---

## Task 4: StickyNote Component

**Files:**
- Create: `src/components/dump/sticky-note.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dump/sticky-note.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface StickyNoteProps {
  id: string
  color: string
  text: string
  x: number
  y: number
  rotation: number
  canvasWidth: number
  canvasHeight: number
  onDragEnd: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
}

const CARD_W = 200
const CARD_H = 200
const DRAG_THRESHOLD = 4

export function StickyNote({
  id, color, text, x, y, rotation,
  canvasWidth, canvasHeight,
  onDragEnd, onDelete,
}: StickyNoteProps) {
  const [pos, setPos] = useState({ x, y })
  const [isDragging, setIsDragging] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moved = useRef(false)

  const clamp = useCallback((px: number, py: number) => ({
    x: Math.max(0, Math.min(px, canvasWidth - CARD_W)),
    y: Math.max(0, Math.min(py, canvasHeight - CARD_H)),
  }), [canvasWidth, canvasHeight])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    moved.current = false
    dragStart.current = { px: e.clientX, py: e.clientY, cx: pos.x, cy: pos.y }

    longPressTimer.current = setTimeout(() => {
      if (!moved.current) setShowDelete(true)
    }, 500)
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.px
    const dy = e.clientY - dragStart.current.py

    if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      moved.current = true
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      setIsDragging(true)
    }

    if (moved.current) {
      setPos(clamp(dragStart.current.cx + dx, dragStart.current.cy + dy))
    }
  }, [clamp])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (moved.current) {
      onDragEnd(id, pos.x, pos.y)
    }
    dragStart.current = null
    setIsDragging(false)
  }, [id, pos, onDragEnd])

  // Fold-corner achieved via ::after equivalent using absolute div
  return (
    <motion.div
      initial={{ scale: 0.8, y: -12 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: CARD_W,
        height: CARD_H,
        transform: `rotate(${rotation}deg)`,
        zIndex: isDragging ? 50 : 'auto',
        background: color,
        borderRadius: 4,
        boxShadow: isDragging
          ? '5px 8px 24px rgba(0,0,0,0.65)'
          : '3px 5px 18px rgba(0,0,0,0.55)',
        padding: '12px 14px 24px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      className="group"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label */}
      <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.45, marginBottom: 7, color: '#000' }}>
        Note
      </p>

      {/* Text */}
      <p style={{ fontSize: 12, lineHeight: 1.55, color: '#1a1200', overflowWrap: 'break-word' }}>
        {text}
      </p>

      {/* Fold corner */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 20, height: 20,
        background: 'rgba(0,0,0,0.15)',
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        borderRadius: '0 0 4px 0',
      }} />

      {/* Delete — unified: shows on hover (desktop) or after long-press (mobile) */}
      {(showDelete || isHovered) && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onDelete(id)}
          style={{ position: 'absolute', top: 6, right: 6 }}
          className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-white text-[11px] font-bold transition-opacity duration-150"
          aria-label="Delete note"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dump/sticky-note.tsx
git commit -m "feat: add StickyNote component with drag and delete"
```

---

## Task 5: TodoCard Component

**Files:**
- Create: `src/components/dump/todo-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dump/todo-card.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { TodoItem } from '@/types/brain-dump'

interface TodoCardProps {
  id: string
  title: string
  items: TodoItem[]
  x: number
  y: number
  canvasWidth: number
  canvasHeight: number
  onDragEnd: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
  onToggleItem: (id: string, itemId: string, done: boolean) => void
  onEditItem: (id: string, itemId: string, text: string) => void
  onAddItem: (id: string, item: TodoItem) => void
  onEditTitle: (id: string, title: string) => void
}

const CARD_W = 240
const CARD_H_MAX = 320
const DRAG_THRESHOLD = 4

export function TodoCard({
  id, title, items, x, y,
  canvasWidth, canvasHeight,
  onDragEnd, onDelete, onToggleItem, onEditItem, onAddItem, onEditTitle,
}: TodoCardProps) {
  const [pos, setPos] = useState({ x, y })
  const [isDragging, setIsDragging] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(title)
  const dragStart = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moved = useRef(false)

  const clamp = useCallback((px: number, py: number) => ({
    x: Math.max(0, Math.min(px, canvasWidth - CARD_W)),
    y: Math.max(0, Math.min(py, canvasHeight - CARD_H_MAX)),
  }), [canvasWidth, canvasHeight])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't drag if clicking inside an interactive element
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return

    e.currentTarget.setPointerCapture(e.pointerId)
    moved.current = false
    dragStart.current = { px: e.clientX, py: e.clientY, cx: pos.x, cy: pos.y }

    longPressTimer.current = setTimeout(() => {
      if (!moved.current) setShowDelete(true)
    }, 500)
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.px
    const dy = e.clientY - dragStart.current.py

    if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      moved.current = true
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      setIsDragging(true)
    }

    if (moved.current) {
      setPos(clamp(dragStart.current.cx + dx, dragStart.current.cy + dy))
    }
  }, [clamp])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (moved.current) onDragEnd(id, pos.x, pos.y)
    dragStart.current = null
    setIsDragging(false)
  }, [id, pos, onDragEnd])

  const handleAddItem = () => {
    if (items.length >= 10) return
    onAddItem(id, { id: crypto.randomUUID(), text: '', done: false })
  }

  return (
    <motion.div
      initial={{ scale: 0.8, y: -12 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: CARD_W,
        maxHeight: CARD_H_MAX,
        zIndex: isDragging ? 50 : 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        boxShadow: isDragging
          ? '5px 8px 24px rgba(0,0,0,0.65)'
          : '3px 5px 18px rgba(0,0,0,0.5)',
      }}
      className="group bg-[#11131e] border border-[#1e2238] border-l-[3px] border-l-[#4a90e2] rounded-[8px] overflow-auto"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-3.5">
        {/* Label */}
        <p className="text-[8px] font-bold uppercase tracking-[1.2px] text-[#4a90e2] mb-2">To-Do</p>

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            maxLength={40}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={() => { setEditingTitle(false); onEditTitle(id, titleValue.trim() || title) }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); onEditTitle(id, titleValue.trim() || title) } }}
            className="w-full bg-transparent text-[11px] font-semibold text-white/80 outline-none border-b border-[#4a90e2]/40 pb-0.5 mb-2"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p
            className="text-[11px] font-semibold text-white/70 mb-2.5 cursor-text truncate"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </p>
        )}

        {/* Items */}
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-2">
              {/* Checkbox */}
              <motion.button
                type="button"
                whileTap={{ scale: 1.2 }}
                transition={{ duration: 0.08 }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => onToggleItem(id, item.id, !item.done)}
                className={`mt-0.5 w-3.5 h-3.5 rounded-[3px] border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                  item.done
                    ? 'bg-[#4a90e2] border-[#4a90e2]'
                    : 'border-[#4a90e2]'
                }`}
                aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.done && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
              </motion.button>

              {/* Item text */}
              {editingItemId === item.id ? (
                <input
                  autoFocus
                  defaultValue={item.text}
                  onBlur={e => { setEditingItemId(null); onEditItem(id, item.id, e.target.value) }}
                  onKeyDown={e => { if (e.key === 'Enter') { setEditingItemId(null); onEditItem(id, item.id, (e.target as HTMLInputElement).value) } }}
                  className="flex-1 bg-transparent text-[11px] text-white/80 outline-none border-b border-white/20 pb-0.5 min-w-0"
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`text-[11px] leading-[1.4] flex-1 cursor-text ${item.done ? 'line-through text-white/30' : 'text-[#b8c0d0]'}`}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setEditingItemId(item.id)}
                >
                  {item.text || <span className="text-white/20 italic">empty</span>}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Add item */}
        {items.length < 10 && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={handleAddItem}
            className="mt-2.5 text-[10px] text-[#4a90e2]/60 hover:text-[#4a90e2] transition-colors duration-150"
          >
            + add item
          </button>
        )}
      </div>

      {/* Delete — unified: shows on hover (desktop) or after long-press (mobile) */}
      {(showDelete || isHovered) && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onDelete(id)}
          style={{ position: 'absolute', top: 6, right: 6 }}
          className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[11px] font-bold transition-opacity duration-150"
          aria-label="Delete to-do"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dump/todo-card.tsx
git commit -m "feat: add TodoCard component with drag, checkboxes, and inline edit"
```

---

## Task 6: AddSheet Component

**Files:**
- Create: `src/components/dump/add-sheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dump/add-sheet.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ColorSwatch } from './color-swatch'
import type { BrainDumpEntry } from '@/types/brain-dump'

const COLORS = [
  '#f5c842', // yellow
  '#f5a623', // amber
  '#b8f0a0', // green
  '#f5b8d4', // pink
  '#a8d8f5', // blue
  '#d4b8f5', // purple
  '#f5d0a0', // peach
]

interface AddSheetProps {
  canvasWidth: number
  canvasHeight: number
  onAdd: (entry: BrainDumpEntry) => void
  onClose: () => void
}

type EntryType = 'note' | 'todo'

function randomPlacement(canvasW: number, canvasH: number, cardW: number, cardH: number) {
  const minX = canvasW * 0.2
  const maxX = canvasW * 0.8 - cardW
  const minY = canvasH * 0.2
  const maxY = canvasH * 0.8 - cardH
  return {
    x: Math.random() * (maxX - minX) + minX,
    y: Math.random() * (maxY - minY) + minY,
  }
}

export function AddSheet({ canvasWidth, canvasHeight, onAdd, onClose }: AddSheetProps) {
  const [entryType, setEntryType] = useState<EntryType>('note')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [noteText, setNoteText] = useState('')
  const [todoTitle, setTodoTitle] = useState('')
  const [todoItems, setTodoItems] = useState(['', ''])

  const canSubmitNote = noteText.trim().length > 0
  const canSubmitTodo = todoTitle.trim().length > 0 && todoItems.some(i => i.trim().length > 0)

  const handleSubmit = () => {
    if (entryType === 'note' && canSubmitNote) {
      const { x, y } = randomPlacement(canvasWidth, canvasHeight, 200, 200)
      onAdd({
        id: crypto.randomUUID(),
        type: 'note',
        color: selectedColor,
        text: noteText.trim(),
        x, y,
        rotation: (Math.random() * 6) - 3,
        createdAt: Date.now(),
      })
    } else if (entryType === 'todo' && canSubmitTodo) {
      const { x, y } = randomPlacement(canvasWidth, canvasHeight, 240, 320)
      onAdd({
        id: crypto.randomUUID(),
        type: 'todo',
        title: todoTitle.trim(),
        items: todoItems
          .filter(t => t.trim().length > 0)
          .map(text => ({ id: crypto.randomUUID(), text: text.trim(), done: false })),
        x, y,
        rotation: 0,
        createdAt: Date.now(),
      })
    }
    onClose()
  }

  const steps = entryType === 'note'
    ? '① Type  ›  ② Color  ›  ③ Write'
    : '① Type  ›  ② Write'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[340px] max-w-[calc(100vw-32px)] z-50 bg-[#12131e] border border-[#22243a] rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1a1c2e]">
          <p className="text-[9px] font-bold uppercase tracking-[1px] text-[#555]">{steps}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1: Type */}
          <div>
            <p className="text-[10px] text-[#555] uppercase tracking-[1px] mb-2">What are you adding?</p>
            <div className="flex gap-2.5">
              {(['note', 'todo'] as EntryType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  className={`flex-1 py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] transition-all duration-150 ${
                    entryType === t
                      ? 'border-[#4a90e2] bg-[#0e1628] text-[#c8d0e0]'
                      : 'border-[#22243a] text-[#666] hover:border-[#333]'
                  }`}
                >
                  <span className="text-xl">{t === 'note' ? '📝' : '☑️'}</span>
                  <span className="font-medium">{t === 'note' ? 'Sticky Note' : 'To-Do List'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 (note only): Color */}
          <AnimatePresence>
            {entryType === 'note' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-[10px] text-[#555] uppercase tracking-[1px] mb-2">Pick a color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      active={selectedColor === c}
                      onClick={() => setSelectedColor(c)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3 (note): Write */}
          {entryType === 'note' && (
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-[1px] mb-2">Your thought</p>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full bg-[#0e0f1a] border border-[#22243a] focus:border-[#4a90e2] rounded-lg px-3 py-2.5 text-[12px] text-[#c8d0e0] placeholder:text-[#333] outline-none resize-none font-sans leading-relaxed transition-colors duration-150"
              />
              {/* Mini preview */}
              {noteText.trim() && (
                <div
                  style={{ background: selectedColor }}
                  className="mt-2 rounded-[4px] px-3 py-2 text-[11px] leading-[1.5] text-black/60 overflow-hidden"
                >
                  <p className="line-clamp-2">{noteText}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2 (todo): Write */}
          {entryType === 'todo' && (
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-[#555] uppercase tracking-[1px] mb-2">List title</p>
                <input
                  value={todoTitle}
                  onChange={e => setTodoTitle(e.target.value.slice(0, 40))}
                  placeholder="e.g. 'Ship v2 tasks'"
                  className="w-full bg-[#0e0f1a] border border-[#22243a] focus:border-[#4a90e2] rounded-lg px-3 py-2 text-[12px] text-[#c8d0e0] placeholder:text-[#333] outline-none font-sans transition-colors duration-150"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#555] uppercase tracking-[1px] mb-2">Items</p>
                <div className="space-y-1.5">
                  {todoItems.map((item, i) => (
                    <input
                      key={i}
                      value={item}
                      onChange={e => {
                        const next = [...todoItems]
                        next[i] = e.target.value
                        setTodoItems(next)
                      }}
                      placeholder={`Item ${i + 1}`}
                      className="w-full bg-[#0e0f1a] border border-[#22243a] focus:border-[#4a90e2] rounded-lg px-3 py-2 text-[11px] text-[#c8d0e0] placeholder:text-[#333] outline-none font-sans transition-colors duration-150"
                    />
                  ))}
                </div>
                {todoItems.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setTodoItems(p => [...p, ''])}
                    className="mt-1.5 text-[10px] text-[#4a90e2]/60 hover:text-[#4a90e2] transition-colors duration-150"
                  >
                    + add item
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={entryType === 'note' ? !canSubmitNote : !canSubmitTodo}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a90e2] to-[#6b5ce7] text-white text-[13px] font-semibold shadow-lg transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Drop it on the board →
          </button>
        </div>
      </motion.div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dump/add-sheet.tsx
git commit -m "feat: add AddSheet bottom sheet creation flow"
```

---

## Task 7: BrainDumpCanvas Component

**Files:**
- Create: `src/components/dump/brain-dump-canvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/dump/brain-dump-canvas.tsx
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { StickyNote } from './sticky-note'
import { TodoCard } from './todo-card'
import {
  updateNotePosition, updateTodoPosition,
  updateTodoItem, addTodoItem, updateTodoTitle,
  deleteEntry,
} from '@/lib/brain-dump'
import type { BrainDumpEntry, NoteEntry, TodoEntry, TodoItem } from '@/types/brain-dump'

interface BrainDumpCanvasProps {
  entries: BrainDumpEntry[]
  onEntriesChange: (entries: BrainDumpEntry[]) => void
}

export function BrainDumpCanvas({ entries, onEntriesChange }: BrainDumpCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteEntry(id)
    onEntriesChange(entries.filter(e => e.id !== id))
  }, [entries, onEntriesChange])

  const handleNoteDragEnd = useCallback((id: string, x: number, y: number) => {
    updateNotePosition(id, x, y)
    onEntriesChange(entries.map(e => e.id === id && e.type === 'note' ? { ...e, x, y } : e))
  }, [entries, onEntriesChange])

  const handleTodoDragEnd = useCallback((id: string, x: number, y: number) => {
    updateTodoPosition(id, x, y)
    onEntriesChange(entries.map(e => e.id === id && e.type === 'todo' ? { ...e, x, y } : e))
  }, [entries, onEntriesChange])

  const handleToggleItem = useCallback((id: string, itemId: string, done: boolean) => {
    updateTodoItem(id, itemId, { done })
    onEntriesChange(entries.map(e => {
      if (e.id !== id || e.type !== 'todo') return e
      return { ...e, items: (e as TodoEntry).items.map(i => i.id === itemId ? { ...i, done } : i) }
    }))
  }, [entries, onEntriesChange])

  const handleEditItem = useCallback((id: string, itemId: string, text: string) => {
    updateTodoItem(id, itemId, { text })
    onEntriesChange(entries.map(e => {
      if (e.id !== id || e.type !== 'todo') return e
      return { ...e, items: (e as TodoEntry).items.map(i => i.id === itemId ? { ...i, text } : i) }
    }))
  }, [entries, onEntriesChange])

  const handleAddItem = useCallback((id: string, item: TodoItem) => {
    addTodoItem(id, item)
    onEntriesChange(entries.map(e => {
      if (e.id !== id || e.type !== 'todo') return e
      return { ...e, items: [...(e as TodoEntry).items, item] }
    }))
  }, [entries, onEntriesChange])

  const handleEditTitle = useCallback((id: string, title: string) => {
    updateTodoTitle(id, title)
    onEntriesChange(entries.map(e =>
      e.id === id && e.type === 'todo' ? { ...e, title } : e
    ))
  }, [entries, onEntriesChange])

  const notes = entries.filter((e): e is NoteEntry => e.type === 'note')
  const todos = entries.filter((e): e is TodoEntry => e.type === 'todo')

  return (
    <div
      ref={canvasRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(74,144,226,0.04) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 70%, rgba(245,200,66,0.03) 0%, transparent 60%),
          #0a0a12
        `,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      {/* Empty state */}
      {entries.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[#c8d0e0]/60 text-sm mb-1">Nothing here yet.</p>
          <p className="text-[#c8d0e0]/40 text-xs mb-3">Tap + to unload your head.</p>
          <span className="text-[#4a90e2]/40 text-lg animate-bounce">↑</span>
        </div>
      )}

      <AnimatePresence>
        {notes.map(note => (
          <StickyNote
            key={note.id}
            {...note}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onDragEnd={handleNoteDragEnd}
            onDelete={handleDelete}
          />
        ))}
        {todos.map(todo => (
          <TodoCard
            key={todo.id}
            {...todo}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onDragEnd={handleTodoDragEnd}
            onDelete={handleDelete}
            onToggleItem={handleToggleItem}
            onEditItem={handleEditItem}
            onAddItem={handleAddItem}
            onEditTitle={handleEditTitle}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dump/brain-dump-canvas.tsx
git commit -m "feat: add BrainDumpCanvas with ResizeObserver and AnimatePresence"
```

---

## Task 8: Dump Page

**Files:**
- Create: `src/app/(app)/dump/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(app)/dump/page.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainDumpCanvas } from '@/components/dump/brain-dump-canvas'
import { AddSheet } from '@/components/dump/add-sheet'
import { loadEntries, addEntry } from '@/lib/brain-dump'
import type { BrainDumpEntry } from '@/types/brain-dump'

export default function DumpPage() {
  const [entries, setEntries] = useState<BrainDumpEntry[]>(() => loadEntries())
  const [sheetOpen, setSheetOpen] = useState(false)

  const noteCount = entries.filter(e => e.type === 'note').length
  const todoCount = entries.filter(e => e.type === 'todo').length

  const handleAdd = (entry: BrainDumpEntry) => {
    addEntry(entry)
    setEntries(prev => [...prev, entry])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] flex-shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-white/90 tracking-[-0.3px]">Brain Dump</h1>
          <p className="text-[11px] text-white/30 mt-0.5">Your mental workspace</p>
        </div>
        <div className="flex gap-2">
          {noteCount > 0 && (
            <span className="text-[10px] text-white/40 bg-white/[0.05] border border-white/[0.08] rounded-full px-2.5 py-1">
              <span className="text-white/60 font-semibold">{noteCount}</span> notes
            </span>
          )}
          {todoCount > 0 && (
            <span className="text-[10px] text-white/40 bg-white/[0.05] border border-white/[0.08] rounded-full px-2.5 py-1">
              <span className="text-white/60 font-semibold">{todoCount}</span> to-dos
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <BrainDumpCanvas
        entries={entries}
        onEntriesChange={setEntries}
      />

      {/* FAB */}
      <AnimatePresence mode="wait">
        <motion.button
          key={sheetOpen ? 'close' : 'open'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setSheetOpen(p => !p)}
          style={{ zIndex: 60 }}
          className="fixed bottom-[72px] right-5 w-12 h-12 rounded-full bg-gradient-to-br from-[#4a90e2] to-[#6b5ce7] flex items-center justify-center text-white text-2xl font-light shadow-[0_4px_20px_rgba(74,144,226,0.4)] hover:shadow-[0_6px_28px_rgba(74,144,226,0.55)] transition-shadow duration-150"
          aria-label={sheetOpen ? 'Close' : 'Add entry'}
        >
          {sheetOpen ? '✕' : '+'}
        </motion.button>
      </AnimatePresence>

      {/* Add sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <AddSheet
            canvasWidth={typeof window !== 'undefined' ? window.innerWidth : 800}
            canvasHeight={typeof window !== 'undefined' ? window.innerHeight - 56 - 56 : 600}
            onAdd={handleAdd}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dump/page.tsx
git commit -m "feat: add Brain Dump page with FAB and entry management"
```

---

## Task 9: Update Bottom Nav

**Files:**
- Modify: `src/components/ui/bottom-nav.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/ui/bottom-nav.tsx` and note the current `NAV_ITEMS` array and `px-6` / `px-5` padding.

- [ ] **Step 2: Add the Dump nav item and adjust layout**

Make the following changes to `bottom-nav.tsx`:

1. Add `NotebookPen` to the lucide-react import
2. Add Dump to `NAV_ITEMS` between `Drop` and `Ask`
3. Change `Profile` label to `Me`
4. Change `px-6` on the wrapper div to `px-2`
5. Change `px-5` on each Link to `px-3`

The updated `NAV_ITEMS` array:
```ts
const NAV_ITEMS = [
  { icon: Home,        label: 'Feed',  href: '/' },
  { icon: Link2,       label: 'Drop',  href: '/drop' },
  { icon: NotebookPen, label: 'Dump',  href: '/dump' },
  { icon: Sparkles,    label: 'Ask',   href: '/ask' },
  { icon: User,        label: 'Me',    href: '/profile' },
]
```

- [ ] **Step 3: Verify the nav renders on the dev server**

```bash
npm run dev
```

Open `http://localhost:3000` and check that 5 nav items appear, none are clipped.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/bottom-nav.tsx
git commit -m "feat: add Dump tab to bottom nav, adjust spacing for 5 items"
```

---

## Task 10: Smoke Test the Full Flow

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (including the new brain-dump tests)

- [ ] **Step 2: Manual smoke test**

With `npm run dev` running:
1. Navigate to `/dump` — empty state shows with bouncing arrow
2. Tap `+` — sheet opens, showing Type step
3. Select "Sticky Note" → pick a non-default color → type text → tap "Drop it on the board" — card appears on canvas with spring animation
4. Drag the sticky note — it moves and stays within bounds
5. Hover the card (desktop) — `×` appears; click it — card fades out and disappears
6. Tap `+` again → select "To-Do List" → add title + 2 items → submit
7. Toggle a checkbox — it checks and strikes through
8. Tap a to-do item's text — inline edit opens; edit and blur — change persists
9. Drag the to-do card
10. Refresh the page — all cards are still there (localStorage persists)
11. Check the bottom nav — 5 items, no clipping on mobile viewport

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Brain Dump — draggable sticky notes and to-do canvas"
```
