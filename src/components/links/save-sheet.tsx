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
