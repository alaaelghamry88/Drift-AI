'use client'

import { Check, Bookmark, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'

const TYPE_FALLBACK: Record<string, string> = {
  video: '▶',
  repo: '⌥',
  tweet: '𝕏',
  article: '📄',
  other: '🔗',
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
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border transition-colors duration-200',
        isKept
          ? 'bg-[#111827] border-amber-500/30'
          : 'bg-[#111827] border-white/[0.05]'
      )}
    >
      <div className="flex gap-4 items-start p-4">
        {/* Thumbnail */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-[68px] h-[50px] rounded-lg overflow-hidden shrink-0 relative bg-white/[0.04] mt-0.5 block"
        >
          {link.thumbnail ? (
            <img
              src={link.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg text-drift-text-tertiary">
              {TYPE_FALLBACK[link.type] ?? '🔗'}
            </div>
          )}
        </a>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block text-body-sm font-medium text-drift-text-primary truncate leading-snug mb-1 hover:text-drift-accent transition-colors duration-150',
              isRead && 'line-through text-drift-text-tertiary'
            )}
          >
            {link.title}
          </a>
          <p className="text-label text-drift-text-tertiary line-clamp-2 leading-snug mb-2.5">
            {link.summary}
          </p>
          <div className="flex items-center justify-between gap-2">
            {/* Source + age + tags */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              {link.favicon && (
                <img
                  src={link.favicon}
                  alt=""
                  className="w-3 h-3 rounded-sm shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <span className="text-label text-drift-text-tertiary shrink-0">{link.siteName}</span>
              <span className="text-label text-white/[0.15] shrink-0">·</span>
              <span className="text-label text-drift-text-tertiary shrink-0">{formatAge(link.savedAt)}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onRead}
                title="Mark as read"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isRead
                    ? 'bg-green-900/40 border border-green-700/50'
                    : 'bg-green-950/60 border border-green-900/50 hover:border-green-700/50'
                )}
              >
                <Check
                  className={cn('w-3.5 h-3.5', isRead ? 'text-green-400' : 'text-green-700')}
                  strokeWidth={2.5}
                />
              </button>
              <button
                onClick={onKeep}
                title="Keep — won't auto-archive"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isKept
                    ? 'bg-amber-900/40 border border-amber-600/60'
                    : 'bg-amber-950/40 border border-amber-900/40 hover:border-amber-700/50'
                )}
              >
                <Bookmark
                  className={cn('w-3.5 h-3.5', isKept ? 'text-amber-400 fill-amber-400' : 'text-amber-800')}
                  strokeWidth={1.5}
                />
              </button>
              <button
                onClick={onRemove}
                title="Remove"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-950/40 border border-red-900/40 hover:border-red-700/50 transition-all duration-200 group"
              >
                <Trash2
                  className="w-3.5 h-3.5 text-red-800 group-hover:text-red-500 transition-colors"
                  strokeWidth={1.5}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
