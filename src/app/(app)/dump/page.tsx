'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainDumpCanvas } from '@/components/dump/brain-dump-canvas'
import { AddSheet } from '@/components/dump/add-sheet'
import { loadEntries, addEntry } from '@/lib/brain-dump'
import type { BrainDumpEntry } from '@/types/brain-dump'

export default function DumpPage() {
  const [entries, setEntries] = useState<BrainDumpEntry[]>(() => loadEntries())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const noteCount = entries.filter(e => e.type === 'note').length
  const todoCount = entries.filter(e => e.type === 'todo').length

  const handleAdd = (entry: BrainDumpEntry) => {
    addEntry(entry)
    setEntries(prev => [...prev, entry])
  }

  return (
    <>
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 10 }}>
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

        <BrainDumpCanvas
          entries={entries}
          onEntriesChange={setEntries}
        />
      </div>

      {mounted && createPortal(
        <>
          <AnimatePresence mode="wait">
            <motion.button
              key={sheetOpen ? 'close' : 'open'}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSheetOpen(p => !p)}
              style={{ zIndex: 60 }}
              className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-[#4a90e2] to-[#6b5ce7] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(74,144,226,0.4)] hover:shadow-[0_6px_28px_rgba(74,144,226,0.55)] transition-shadow duration-150"
              aria-label={sheetOpen ? 'Close' : 'Add entry'}
            >
              <span style={{ fontSize: 28, lineHeight: 1, marginTop: -1 }}>{sheetOpen ? '✕' : '+'}</span>
            </motion.button>
          </AnimatePresence>

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
        </>,
        document.body
      )}
    </>
  )
}
