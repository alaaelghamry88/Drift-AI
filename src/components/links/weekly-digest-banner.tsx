'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, BarChart2 } from 'lucide-react'
import type { SavedLink } from '@/types/saved-link'
import { useProfile } from '@/hooks/use-profile'

const DISMISS_KEY = 'drift-digest-dismissed-at'
const DIGEST_CACHE_KEY = 'drift-digest-cache'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DIGEST_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MIN_LINKS = 0 // TODO: restore to 7 before shipping

interface DigestCache {
  narrative: string
  relevantIds: string[]
  cachedAt: number
}

function readDigestCache(): DigestCache | null {
  try {
    const raw = localStorage.getItem(DIGEST_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DigestCache
    if (Date.now() - parsed.cachedAt > DIGEST_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeDigestCache(data: Omit<DigestCache, 'cachedAt'>): void {
  try {
    localStorage.setItem(DIGEST_CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }))
  } catch { /* ignore */ }
}

interface WeeklyDigestBannerProps {
  links: SavedLink[]
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

function getDateRange(): string {
  const end = new Date()
  const start = new Date(Date.now() - WEEK_MS)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

const TYPE_EMOJI: Record<string, string> = {
  article: '📄',
  video: '▶️',
  repo: '⚙️',
  tweet: '🐦',
  other: '🔗',
}

const TYPE_BADGE: Record<string, string> = {
  article: 'text-drift-accent bg-drift-accent/10',
  video:   'text-drift-gold bg-drift-gold/10',
  repo:    'text-drift-text-secondary bg-white/[0.06]',
  tweet:   'text-blue-400 bg-blue-400/10',
  other:   'text-drift-text-tertiary bg-white/[0.04]',
}

function renderNarrative(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-drift-accent font-semibold">{part}</strong>
      : part
  )
}

export function WeeklyDigestBanner({ links }: WeeklyDigestBannerProps) {
  const { profile } = useProfile()
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [digest, setDigest] = useState<{ narrative: string; relevantIds: string[] } | null>(
    () => readDigestCache()
  )
  const [mounted, setMounted] = useState(false)

  const recentLinks = getRecentLinks(links)
  const unread = recentLinks.filter(l => l.status === 'active')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (recentLinks.length >= MIN_LINKS && !isDismissed()) {
      setVisible(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLinks.length])

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  useEffect(() => {
    if (!sheetOpen || digest) return
    const payload = recentLinks.map(l => ({
      id: l.id,
      title: l.title,
      summary: l.summary,
      type: l.type,
      status: l.status,
    }))
    fetch('/api/links/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: payload, currentContext: profile?.currentContext ?? '' }),
    })
      .then(r => r.json())
      .then((d: { narrative: string; relevantIds: string[] }) => {
        if (d.narrative || d.relevantIds?.length) {
          setDigest(d)
          writeDigestCache(d)
        }
      })
      .catch(() => { /* silent fail */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen])

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  // Order unread links by relevantIds when available, else by recency
  const orderedUnread = digest?.relevantIds?.length
    ? [...unread].sort((a, b) => {
        const ai = digest.relevantIds.indexOf(a.id)
        const bi = digest.relevantIds.indexOf(b.id)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : [...unread].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())

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
          <p className="text-[16px] font-semibold text-drift-accent leading-tight">This week&rsquo;s recap</p>
          <p className="text-label text-drift-text-tertiary mt-0.5">
            {recentLinks.length} saved · {unread.length} unread
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

      {mounted && createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSheetOpen(false)}
                className="fixed inset-0 bg-black/50 z-[200]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[60%] z-[201] bg-[#0d1a28] border border-white/[0.07] rounded-2xl px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto overscroll-contain drift-scrollbar"
              >
                <div className="w-8 h-1 bg-white/[0.10] rounded-full mx-auto mb-5" />

                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-drift-text-tertiary mb-1">
                      Week recap
                    </p>
                    <h3 className="text-h2 font-semibold text-drift-text-primary leading-snug">
                      Your week in links
                    </h3>
                  </div>
                  <button
                    onClick={() => setSheetOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-drift-text-tertiary hover:text-drift-text-secondary transition-colors ml-3 shrink-0"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Narrative pill */}
                <div className="relative overflow-hidden rounded-2xl border border-drift-accent/[0.16] bg-gradient-to-br from-drift-accent/[0.09] to-drift-elevated/30 px-4 py-3.5 mb-5">
                  <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-drift-accent/[0.12] blur-xl" />
                  <p className="text-[16px] font-bold uppercase tracking-widest text-drift-accent mb-2 relative">
                    {getDateRange()}
                  </p>
                  {digest?.narrative ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-body text-drift-text-secondary leading-relaxed relative"
                    >
                      {renderNarrative(digest.narrative)}
                    </motion.p>
                  ) : (
                    <div className="space-y-2 relative">
                      <div className="h-3 w-full bg-white/[0.06] rounded animate-pulse" />
                      <div className="h-3 w-5/6 bg-white/[0.06] rounded animate-pulse" />
                      <div className="h-3 w-4/6 bg-white/[0.06] rounded animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Picks */}
                {orderedUnread.length > 0 && (
                  <>
                    <p className="text-[14px] font-bold uppercase tracking-widest text-drift-text-tertiary mb-3">
                      Relevant to what you&rsquo;re building
                    </p>
                    <div className="space-y-2">
                      {orderedUnread.map(l => (
                        <motion.a
                          layout
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 bg-white/[0.025] border border-white/[0.055] rounded-xl px-3 py-2.5 hover:border-drift-accent/20 transition-colors duration-150"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                            {l.favicon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.favicon} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <span className="text-sm">{TYPE_EMOJI[l.type] ?? '🔗'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-semibold text-drift-text-primary leading-snug truncate mb-0.5">
                              {l.title}
                            </p>
                            <p className="text-[13px] text-drift-text-tertiary leading-relaxed line-clamp-2">
                              {l.summary}
                            </p>
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${TYPE_BADGE[l.type] ?? TYPE_BADGE.other}`}>
                            {l.type}
                          </span>
                        </motion.a>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
