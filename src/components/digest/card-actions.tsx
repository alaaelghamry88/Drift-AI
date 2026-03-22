'use client'

import { Bookmark, X, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CardAction } from '@/types/digest'

interface CardActionsProps {
  cardId: string
  action?: CardAction
  isExpanded?: boolean
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function CardActions({ cardId, action, isExpanded, onAction, onGoDeeper }: CardActionsProps) {
  if (action && action !== 'go_deeper') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]',
        )}
      >
        <span className={cn(
          'text-label px-3 py-1.5 rounded-full border',
          action === 'save'
            ? 'text-drift-accent border-drift-accent/30 bg-drift-accent/10'
            : 'text-drift-muted border-white/10 bg-white/5'
        )}>
          {action === 'save' ? 'Saved' : 'Skipped'}
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
        onClick={() => onAction('skip')}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'text-drift-text-tertiary hover:text-drift-muted hover:bg-white/5',
          'transition-all duration-200'
        )}
        title="Skip"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>

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
