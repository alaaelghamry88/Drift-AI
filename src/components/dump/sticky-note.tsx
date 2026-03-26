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
const CARD_H_MIN = 120
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
    y: Math.max(0, Math.min(py, canvasHeight - CARD_H_MIN)),
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
        minHeight: CARD_H_MIN,
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
      <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.45, marginBottom: 7, color: '#000' }}>
        Note
      </p>

      <p style={{ fontSize: 12, lineHeight: 1.55, color: '#1a1200', overflowWrap: 'break-word' }}>
        {text}
      </p>

      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 20, height: 20,
        background: 'rgba(0,0,0,0.15)',
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        borderRadius: '0 0 4px 0',
      }} />

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
