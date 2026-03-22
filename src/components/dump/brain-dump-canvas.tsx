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
