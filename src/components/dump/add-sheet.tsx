// src/components/dump/add-sheet.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ColorSwatch } from './color-swatch'
import type { BrainDumpEntry } from '@/types/brain-dump'

const COLORS = [
  '#f5c842',
  '#f5a623',
  '#b8f0a0',
  '#f5b8d4',
  '#a8d8f5',
  '#d4b8f5',
  '#f5d0a0',
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
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[340px] max-w-[calc(100vw-32px)] z-50 bg-[#12131e] border border-[#22243a] rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-4 py-3 border-b border-[#1a1c2e]">
          <p className="text-[9px] font-bold uppercase tracking-[1px] text-[#555]">{steps}</p>
        </div>

        <div className="p-4 space-y-4">
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
