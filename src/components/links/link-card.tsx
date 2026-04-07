'use client'

import { useState } from 'react'
import { Check, Bookmark, Trash2, FolderPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'
import { CollectionPicker } from '@/components/links/collection-picker'

const TYPE_GLYPH: Record<string, string> = {
  video:   '▶',
  repo:    '⌥',
  tweet:   '𝕏',
  article: '∥',
  other:   '◈',
}

const TYPE_GLYPH_COLOR: Record<string, string> = {
  video:   'text-violet-600/80',
  repo:    'text-sky-700/80',
  tweet:   'text-sky-600/80',
  article: 'text-amber-800/70',
  other:   'text-drift-card-warm-body/50',
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
  collections: Collection[]
  isExpanded?: boolean
  onRead: () => void
  onKeep: () => void
  onRemove: () => void
  onUpdateLink: (patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>) => void
  onCollectionCreated: (col: Collection) => void
}

export function LinkCard({
  link,
  collections,
  isExpanded = false,
  onRead,
  onKeep,
  onRemove,
  onUpdateLink,
  onCollectionCreated,
}: LinkCardProps) {
  const isRead = link.status === 'read'
  const isKept = link.status === 'kept'
  const [showAssign, setShowAssign] = useState(false)
  const [note, setNote] = useState(link.note)

  const primaryCollection = collections.find(c => link.collectionIds.includes(c.id))

  const handleNoteBlur = () => {
    if (note !== link.note) onUpdateLink({ note })
  }

  const handleCollectionToggle = (id: string) => {
    const next = link.collectionIds.includes(id)
      ? link.collectionIds.filter(c => c !== id)
      : [...link.collectionIds, id]
    onUpdateLink({ collectionIds: next })
  }

  const handleCollectionCreated = (col: Collection) => {
    onCollectionCreated(col)
    onUpdateLink({ collectionIds: [...link.collectionIds, col.id] })
  }

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
            <span className={cn('text-xs', TYPE_GLYPH_COLOR[link.type] ?? 'text-drift-card-warm-body/60')}>
              {TYPE_GLYPH[link.type] ?? '◈'}
            </span>
          )}
          <span className="text-label text-drift-card-warm-body truncate max-w-[140px]">
            {link.siteName}
          </span>
          <span className="text-drift-card-warm-body/40 text-xs shrink-0">·</span>
          <span className="text-label text-drift-card-warm-body/60 shrink-0">{formatAge(link.savedAt)}</span>

          {primaryCollection && (
            <span className="ml-auto text-[10px] font-medium text-drift-accent/80 bg-drift-accent/[0.08] border border-drift-accent/[0.15] px-1.5 py-0.5 rounded-md shrink-0">
              {primaryCollection.emoji} {primaryCollection.name}
            </span>
          )}
          {!primaryCollection && isKept && (
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

            {/* Note display (collapsed state) */}
            {link.note && !isExpanded && !showAssign && (
              <p className="text-label text-drift-card-warm-body/70 italic mb-1.5 pl-2.5 border-l-2 border-drift-accent/25">
                {link.note}
              </p>
            )}

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

        {/* Inline expand area */}
        <AnimatePresence>
          {(isExpanded || showAssign) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-drift-card-warm-border/60 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-card-warm-body/40 mb-1.5">
                    Note
                  </p>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onBlur={handleNoteBlur}
                    placeholder="Why are you saving this?"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-label text-drift-card-warm-body placeholder:text-drift-card-warm-body/30 outline-none focus:border-drift-accent/30 transition-colors duration-200"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-card-warm-body/40 mb-1.5">
                    Collection
                  </p>
                  <CollectionPicker
                    selected={link.collectionIds}
                    collections={collections}
                    onToggle={handleCollectionToggle}
                    onNew={handleCollectionCreated}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions row */}
        <div className="mt-3.5 pt-3 border-t border-drift-card-warm-border flex items-center justify-end gap-2">
          <button
            onClick={() => setShowAssign(v => !v)}
            title="Add to collection"
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200',
              showAssign || link.collectionIds.length > 0
                ? 'bg-drift-accent/15 border-drift-accent/40 text-drift-accent'
                : 'bg-drift-card-warm-title/5 border-drift-card-warm-border text-drift-card-warm-body hover:bg-drift-accent/10 hover:border-drift-accent/30 hover:text-drift-accent'
            )}
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>

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
