'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, BarChart2 } from 'lucide-react'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'

const DISMISS_KEY = 'drift-digest-dismissed-at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MIN_LINKS = 7

interface WeeklyDigestBannerProps {
  links: SavedLink[]
  collections: Collection[]
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

function getRecentLinks(links: SavedLink[]): SavedLink[] {
  const cutoff = Date.now() - WEEK_MS
  return links.filter(l => new Date(l.savedAt).getTime() > cutoff)
}

export function WeeklyDigestBanner({ links, collections }: WeeklyDigestBannerProps) {
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [headline, setHeadline] = useState('')

  const recentLinks = getRecentLinks(links)
  const unread = recentLinks.filter(l => l.status === 'active')
  const usedCollectionIds = new Set(recentLinks.flatMap(l => l.collectionIds))
  const usedCollections = collections.filter(c => usedCollectionIds.has(c.id))

  useEffect(() => {
    if (recentLinks.length >= MIN_LINKS && !isDismissed()) {
      setVisible(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLinks.length])

  useEffect(() => {
    if (!sheetOpen || headline) return
    const payload = recentLinks.map(l => ({ title: l.title, summary: l.summary }))
    fetch('/api/links/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: payload }),
    })
      .then(r => r.json())
      .then((d: { headline: string }) => { if (d.headline) setHeadline(d.headline) })
      .catch(() => { /* silent fail */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen])

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  // Group recent links by collection for the sheet
  const byCollection: Array<{ collection: Collection | null; links: SavedLink[] }> = []
  const assigned = new Set<string>()

  for (const col of usedCollections) {
    const colLinks = recentLinks.filter(l => l.collectionIds.includes(col.id))
    if (colLinks.length > 0) {
      byCollection.push({ collection: col, links: colLinks })
      colLinks.forEach(l => assigned.add(l.id))
    }
  }

  const uncollected = recentLinks.filter(l => !assigned.has(l.id))
  if (uncollected.length > 0) {
    byCollection.push({ collection: null, links: uncollected })
  }

  if (!visible) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-3.5 py-3 bg-drift-accent/[0.06] border border-drift-accent/[0.15] rounded-2xl cursor-pointer"
        onClick={() => setSheetOpen(true)}
      >
        <BarChart2 className="w-4 h-4 text-drift-accent shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-drift-accent leading-tight">This week&rsquo;s recap</p>
          <p className="text-label text-drift-text-tertiary mt-0.5">
            {recentLinks.length} saved · {unread.length} unread
            {usedCollections.length > 0 && ` · ${usedCollections.length} collection${usedCollections.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-drift-accent/60 shrink-0" strokeWidth={1.5} />
        <button
          onClick={e => { e.stopPropagation(); handleDismiss() }}
          className="text-drift-text-tertiary hover:text-drift-text-secondary transition-colors duration-150 shrink-0"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </motion.div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1424] border-t border-white/[0.08] rounded-t-2xl px-5 pt-5 pb-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-8 h-1 bg-white/[0.12] rounded-full mx-auto mb-5" />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-drift-text-tertiary mb-1">
                    Week recap
                  </p>
                  <h3 className="text-body font-semibold text-drift-text-primary leading-snug">
                    {recentLinks.length} links saved, {unread.length} unread
                  </h3>
                  {headline ? (
                    <p className="text-body-sm text-drift-text-secondary mt-1.5 leading-relaxed">
                      {headline}
                    </p>
                  ) : (
                    <div className="h-4 w-3/4 bg-white/[0.06] rounded animate-pulse mt-1.5" />
                  )}
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-drift-text-tertiary hover:text-drift-text-secondary transition-colors ml-3 shrink-0"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-5 mt-5">
                {byCollection.map(({ collection, links: colLinks }) => (
                  <div key={collection?.id ?? '__uncollected__'}>
                    <p className="text-label font-semibold text-drift-text-secondary mb-2.5">
                      {collection ? `${collection.emoji} ${collection.name}` : 'Other'}
                      <span className="text-drift-text-tertiary font-normal ml-1.5">
                        {colLinks.length} link{colLinks.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                    <div className="space-y-2">
                      {colLinks.map(l => (
                        <div key={l.id} className="flex items-start gap-2.5">
                          <div className="w-1 h-1 rounded-full bg-drift-accent/40 mt-2 shrink-0" />
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-label text-drift-card-warm-title hover:text-drift-accent transition-colors duration-150 leading-relaxed"
                          >
                            {l.title}
                          </a>
                          {l.status === 'active' && (
                            <span className="text-[10px] text-drift-text-tertiary shrink-0 mt-0.5">unread</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
