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
