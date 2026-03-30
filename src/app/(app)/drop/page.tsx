'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import {
  loadLinks,
  addLink,
  updateLinkStatus,
  removeLink,
  getActiveLinks,
  archiveExpiredLinks,
  createSavedLink,
} from '@/lib/saved-links'
import type { SavedLink } from '@/types/saved-link'
import { logActivity } from '@/lib/activity-log'
import { ContextBar } from '@/components/links/context-bar'
import { TagFilter } from '@/components/links/tag-filter'
import { LinkCard } from '@/components/links/link-card'

async function scoreLinks(
  context: string,
  links: SavedLink[]
): Promise<Map<string, number>> {
  if (!context || links.length === 0) return new Map()
  try {
    const res = await fetch('/api/links/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        links: links.map(l => ({ id: l.id, title: l.title, summary: l.summary })),
      }),
    })
    if (!res.ok) return new Map()
    const data = await res.json() as { id: string; score: number }[]
    return new Map(data.map(d => [d.id, d.score]))
  } catch {
    return new Map()
  }
}

export default function DropPage() {
  const { profile } = useProfile()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [context, setContext] = useState('')
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [scoringContext, setScoringContext] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  // Load links and archive expired ones on mount
  useEffect(() => {
    archiveExpiredLinks()
    setLinks(getActiveLinks())
  }, [])

  // Initialise context from profile
  useEffect(() => {
    if (profile?.currentContext && !context) {
      setContext(profile.currentContext)
    }
  }, [profile, context])

  // Re-score when context meaningfully changes (debounced)
  useEffect(() => {
    if (!context || context === scoringContext) return
    const timer = setTimeout(async () => {
      const active = getActiveLinks()
      const map = await scoreLinks(context, active)
      setScores(map)
      setScoringContext(context)
    }, 800)
    return () => clearTimeout(timer)
  }, [context, scoringContext])

  const handleSave = useCallback(async (url: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const meta = res.ok ? await res.json() : {}
      const link = createSavedLink({
        url,
        title: meta.title ?? url,
        summary: meta.summary ?? '',
        thumbnail: meta.thumbnail ?? null,
        favicon: meta.favicon ?? null,
        siteName: meta.siteName ?? new URL(url).hostname,
        type: meta.type ?? 'other',
        tags: meta.tags ?? [],
        source: 'manual',
      })
      addLink(link)
      logActivity('link_saved')
      setLinks(getActiveLinks())
      // Score the new link immediately
      if (context) {
        const map = await scoreLinks(context, getActiveLinks())
        setScores(map)
        setScoringContext(context)
      }
    } finally {
      setIsSaving(false)
    }
  }, [context])

  const handleSubmit = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed || isSaving) return
    try { new URL(trimmed) } catch {
      setUrlError('Enter a valid URL (e.g. https://example.com)')
      return
    }
    setUrlError('')
    setUrlInput('')
    handleSave(trimmed)
  }, [urlInput, isSaving, handleSave])

  const handleStatus = useCallback((id: string, status: SavedLink['status']) => {
    updateLinkStatus(id, status)
    if (status === 'read') logActivity('link_read')
    else if (status === 'kept') logActivity('link_kept')
    setLinks(getActiveLinks())
  }, [])

  const handleRemove = useCallback((id: string) => {
    removeLink(id)
    logActivity('link_removed')
    setLinks(getActiveLinks())
  }, [])

  // All unique types from active links
  const allTypes = useMemo(
    () => Array.from(new Set(links.map(l => l.type))),
    [links]
  )

  const toggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const filtered = useMemo(() => {
    if (activeTypes.length === 0) return links
    return links.filter(l => activeTypes.includes(l.type))
  }, [links, activeTypes])

  const relevant = filtered.filter(l => (scores.get(l.id) ?? 0) >= 6)
  const other = filtered.filter(l => (scores.get(l.id) ?? 0) < 6)

  // Links expiring within 24h (active, not kept)
  const expiringIds = useMemo(() => {
    const threshold = Date.now() + 24 * 60 * 60 * 1000
    return new Set(
      links
        .filter(l => l.status === 'active' && new Date(l.expiresAt).getTime() < threshold)
        .map(l => l.id)
    )
  }, [links])

  const hasScores = scores.size > 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-h1 text-drift-text-primary leading-none">Drop</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-1.5">
          Your personal link library.
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Controls zone — tighter grouping */}
      <div className="space-y-3">
        {/* Context bar */}
        <ContextBar value={context} onChange={setContext} />

        {/* URL input */}
        <motion.div
          animate={{
            boxShadow: isSaving
              ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
              : '0 0 0 1px rgba(255,255,255,0.06)',
          }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-[#111827] overflow-hidden"
        >
          <div className={cn('flex items-center gap-3 px-4 py-3.5', isSaving && 'opacity-60 pointer-events-none')}>
            <Link2 className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
            <input
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="Paste a URL to save..."
              className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
            />
            <AnimatePresence>
              {urlInput.trim() && !isSaving && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
                >
                  Save
                  <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {urlError && (
            <p className="px-4 pb-3 text-label text-red-400">{urlError}</p>
          )}
        </motion.div>

        {/* Type filter */}
        {allTypes.length > 0 && (
          <TagFilter
            tags={allTypes}
            active={activeTypes}
            onToggle={toggleType}
            onClear={() => setActiveTypes([])}
          />
        )}

        {/* Expiry nudge */}
        {expiringIds.size > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
            <span className="text-label text-amber-400">
              {expiringIds.size === 1
                ? '1 link expires within 24 hours'
                : `${expiringIds.size} links expire within 24 hours`}
              {' — '}bookmark to keep them.
            </span>
          </div>
        )}
      </div>

      {/* Skeleton while saving */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex gap-3 items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="w-[60px] h-[44px] rounded-lg bg-white/[0.06] shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-white/[0.06] w-3/4 animate-pulse" />
              <div className="h-2.5 rounded bg-white/[0.04] w-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link sections */}
      {filtered.length === 0 && !isSaving ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          {links.length === 0 ? (
            <>
              <p className="text-body text-drift-text-secondary mb-1">No links saved yet.</p>
              <p className="text-body-sm text-drift-text-tertiary">
                Tap + to save your first link.
              </p>
            </>
          ) : (
            <p className="text-body text-drift-text-secondary">No links match these filters.</p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Relevant section */}
          {hasScores && relevant.length > 0 && (
            <section className="space-y-3">
              <p className="text-label text-drift-text-tertiary px-0.5">Relevant to you now</p>
              <AnimatePresence mode="popLayout">
                {relevant.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {/* Other / all links */}
          {(other.length > 0 || !hasScores) && (
            <section className="space-y-3">
              {hasScores && relevant.length > 0 && other.length > 0 && (
                <p className="text-label text-drift-text-tertiary px-0.5">Other saved</p>
              )}
              <AnimatePresence mode="popLayout">
                {(hasScores ? other : filtered).map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}

    </div>
  )
}
