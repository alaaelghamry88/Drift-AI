'use client'

import { Check, Bookmark, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'

const TYPE_GLYPH: Record<string, string> = {
  video:   '▶',
  repo:    '⌥',
  tweet:   '𝕏',
  article: '∥',
  other:   '◈',
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
  onRead: () => void
  onKeep: () => void
  onRemove: () => void
}

export function LinkCard({ link, onRead, onKeep, onRemove }: LinkCardProps) {
  const isRead = link.status === 'read'
  const isKept = link.status === 'kept'

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
      {/* Warm accent left bar for kept */}
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
            <span className="text-xs text-drift-card-warm-body/60">
              {TYPE_GLYPH[link.type] ?? '◈'}
            </span>
          )}
          <span className="text-label text-drift-card-warm-body truncate max-w-[140px]">
            {link.siteName}
          </span>
          <span className="text-drift-card-warm-body/40 text-xs shrink-0">·</span>
          <span className="text-label text-drift-card-warm-body/60 shrink-0">{formatAge(link.savedAt)}</span>
          {isKept && (
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

        {/* Actions row */}
        <div className="mt-3.5 pt-3 border-t border-drift-card-warm-border flex items-center justify-end gap-2">
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
