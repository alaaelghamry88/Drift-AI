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
        <p className="text-[8px] font-bold uppercase tracking-[1.2px] text-[#4a90e2] mb-2">To-Do</p>

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

        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-2">
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
