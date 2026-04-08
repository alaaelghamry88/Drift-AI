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
  updateLink,
  removeLink,
  getActiveLinks,
  archiveExpiredLinks,
  createSavedLink,
} from '@/lib/saved-links'
import {
  getCollections,
  addCollection,
} from '@/lib/saved-collections'
import type { SavedLink } from '@/types/saved-link'
import type { Collection } from '@/types/collection'
import { logActivity } from '@/lib/activity-log'
import { ContextBar } from '@/components/links/context-bar'
import { TagFilter } from '@/components/links/tag-filter'
import { LinkCard } from '@/components/links/link-card'
import { CollectionBar } from '@/components/links/collection-bar'
import { ClusterNudge } from '@/components/links/cluster-nudge'
import { WeeklyDigestBanner } from '@/components/links/weekly-digest-banner'

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

async function fetchClusterSuggestion(
  links: SavedLink[]
): Promise<{ name: string; ids: string[] } | null> {
  const uncollected = links.filter(l => l.collectionIds.length === 0)
  if (uncollected.length < 3) return null
  try {
    const res = await fetch('/api/links/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        links: uncollected.map(l => ({ id: l.id, title: l.title, summary: l.summary })),
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { name: string | null; ids: string[] }
    if (!data.name || data.ids.length < 3) return null
    return { name: data.name, ids: data.ids }
  } catch {
    return null
  }
}

export default function DropPage() {
  const { profile } = useProfile()
  const [links, setLinks] = useState<SavedLink[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [context, setContext] = useState('')
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [scoringContext, setScoringContext] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [clusterSuggestion, setClusterSuggestion] = useState<{ name: string; ids: string[] } | null>(null)
  const [clusterDismissed, setClusterDismissed] = useState(false)

  useEffect(() => {
    archiveExpiredLinks()
    setLinks(getActiveLinks())
    setCollections(getCollections())
  }, [])

  useEffect(() => {
    if (profile?.currentContext && !context) {
      setContext(profile.currentContext)
    }
  }, [profile, context])

  // Auto-collapse expanded card after 8 seconds
  useEffect(() => {
    if (!expandedId) return
    const timer = setTimeout(() => setExpandedId(null), 8000)
    return () => clearTimeout(timer)
  }, [expandedId])

  // Re-score when context changes (debounced)
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

  // Run cluster check lazily after links settle
  useEffect(() => {
    if (clusterDismissed || clusterSuggestion) return
    const active = getActiveLinks()
    if (active.length < 3) return
    const timer = setTimeout(async () => {
      const suggestion = await fetchClusterSuggestion(active)
      if (suggestion) setClusterSuggestion(suggestion)
    }, 2000)
    return () => clearTimeout(timer)
  }, [links, clusterDismissed, clusterSuggestion])

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
      setExpandedId(link.id)
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

  const handleUpdateLink = useCallback((
    id: string,
    patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>
  ) => {
    updateLink(id, patch)
    setLinks(getActiveLinks())
  }, [])

  const handleCollectionCreated = useCallback((col: Collection) => {
    addCollection(col)
    setCollections(getCollections())
  }, [])

  const handleNewCollection = useCallback((col: Collection) => {
    addCollection(col)
    setCollections(getCollections())
    setActiveCollection(col.id)
  }, [])

  const handleAcceptCluster = useCallback((name: string, ids: string[]) => {
    const col: Collection = {
      id: crypto.randomUUID(),
      name,
      emoji: '✦',
      createdAt: new Date().toISOString(),
      source: 'ai-suggested',
    }
    addCollection(col)
    const active = getActiveLinks()
    ids.forEach(id => {
      const link = active.find(l => l.id === id)
      if (link) updateLink(id, { collectionIds: [...link.collectionIds, col.id] })
    })
    setCollections(getCollections())
    setLinks(getActiveLinks())
    setClusterSuggestion(null)
  }, [])

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
    let result = links
    if (activeCollection) {
      result = result.filter(l => l.collectionIds.includes(activeCollection))
    }
    if (activeTypes.length > 0) {
      result = result.filter(l => activeTypes.includes(l.type))
    }
    return result
  }, [links, activeCollection, activeTypes])

  const relevant = filtered.filter(l => (scores.get(l.id) ?? 0) >= 6)
  const other = filtered.filter(l => (scores.get(l.id) ?? 0) < 6)

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
      <div className="mb-8">
        <h1 className="text-h1 text-drift-text-primary leading-none">Drop</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-1.5">
          Your personal link library.
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      <div className="space-y-3">
        <ContextBar value={context} onChange={setContext} />

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

        {(collections.length > 0 || links.length > 0) && (
          <CollectionBar
            collections={collections}
            active={activeCollection}
            onSelect={setActiveCollection}
            onNew={handleNewCollection}
          />
        )}

        {allTypes.length > 0 && (
          <TagFilter
            tags={allTypes}
            active={activeTypes}
            onToggle={toggleType}
            onClear={() => setActiveTypes([])}
          />
        )}

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

        <WeeklyDigestBanner links={links} />

        {clusterSuggestion && !clusterDismissed && (
          <ClusterNudge
            suggestion={clusterSuggestion}
            onAccept={handleAcceptCluster}
            onDismiss={() => { setClusterDismissed(true); setClusterSuggestion(null) }}
          />
        )}
      </div>

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
          {hasScores && relevant.length > 0 && (
            <section className="space-y-3">
              <p className="text-label text-drift-accent/60 px-0.5">Relevant to you now</p>
              <AnimatePresence mode="popLayout">
                {relevant.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    collections={collections}
                    isExpanded={expandedId === link.id}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                    onUpdateLink={patch => handleUpdateLink(link.id, patch)}
                    onCollectionCreated={handleCollectionCreated}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

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
                    collections={collections}
                    isExpanded={expandedId === link.id}
                    onRead={() => handleStatus(link.id, link.status === 'read' ? 'active' : 'read')}
                    onKeep={() => handleStatus(link.id, link.status === 'kept' ? 'active' : 'kept')}
                    onRemove={() => handleRemove(link.id)}
                    onUpdateLink={patch => handleUpdateLink(link.id, patch)}
                    onCollectionCreated={handleCollectionCreated}
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
