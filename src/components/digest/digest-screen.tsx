'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, Eye, RotateCcw, ChevronDown, ExternalLink,
  Zap, BookOpen, Play, GitBranch, Lightbulb, RefreshCw, Library
} from 'lucide-react'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard, CardAction } from '@/types/digest'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { DoneState } from '@/components/digest/done-state'
import { useStreaming } from '@/hooks/use-streaming'
import { addLink, createSavedLink } from '@/lib/saved-links'
import { cn } from '@/lib/utils'

interface DigestScreenProps {
  profile: DriftProfile
}

const CARD_TYPE_CONFIG = {
  tool_release: {
    icon: Zap,
    label: 'Tool Release',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    topAccent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
  },
  article: {
    icon: BookOpen,
    label: 'Article',
    color: 'text-drift-accent',
    bg: 'bg-drift-accent/10 border-drift-accent/25',
    topAccent: 'bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent',
  },
  video: {
    icon: Play,
    label: 'Video',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/25',
    topAccent: 'bg-gradient-to-r from-violet-400/70 via-violet-400/20 to-transparent',
  },
  repo: {
    icon: GitBranch,
    label: 'Repo',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/25',
    topAccent: 'bg-gradient-to-r from-sky-400/70 via-sky-400/20 to-transparent',
  },
  skill: {
    icon: Lightbulb,
    label: 'Skill',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    topAccent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
  },
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-[#1d1b16]/60 backdrop-blur-2xl p-5 space-y-4 animate-pulse shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-white/[0.07] rounded-lg w-24" />
        <div className="h-6 bg-white/[0.06] rounded-lg w-16" />
      </div>
      <div className="space-y-2.5">
        <div className="h-5 bg-white/[0.08] rounded-full w-5/6" />
        <div className="h-5 bg-white/[0.06] rounded-full w-3/4" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 bg-white/[0.05] rounded-full" />
        <div className="h-3.5 bg-white/[0.05] rounded-full w-5/6" />
        <div className="h-3.5 bg-white/[0.04] rounded-full w-4/6" />
      </div>
      <div className="h-11 bg-white/[0.03] rounded-xl border border-white/[0.05]" />
      <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
        <div className="h-8 bg-white/[0.06] rounded-lg w-16" />
        <div className="h-8 bg-white/[0.06] rounded-lg w-20" />
      </div>
    </div>
  )
}

function DigestCardItem({
  card,
  profile,
  action,
  isExpanded,
  cachedDeeperText,
  onAction,
  onUndo,
  onToggleExpand,
  onDeeperLoaded,
}: {
  card: DigestCard
  profile: DriftProfile
  action?: CardAction
  isExpanded: boolean
  cachedDeeperText?: string
  onAction: (id: string, action: CardAction) => void
  onUndo: (id: string) => void
  onToggleExpand: (id: string) => void
  onDeeperLoaded: (id: string, text: string) => void
}) {
  const config = CARD_TYPE_CONFIG[card.card_type] ?? CARD_TYPE_CONFIG.article
  const Icon = config.icon
  const { text: streamedText, isStreaming, stream } = useStreaming()

  const deeperText = cachedDeeperText ?? streamedText

  const handleGoDeeper = useCallback(async () => {
    if (isExpanded) {
      onToggleExpand(card.id)
      return
    }
    onToggleExpand(card.id)
    if (cachedDeeperText) return
    const result = await stream(() =>
      fetch('/api/deeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, card }),
      })
    )
    if (result) onDeeperLoaded(card.id, result)
  }, [isExpanded, card, profile, cachedDeeperText, onToggleExpand, stream, onDeeperLoaded])

  const isSaved = action === 'save'
  const isRead = action === 'read'
  const [savedToLinks, setSavedToLinks] = useState(false)

  const handleSaveToLinks = useCallback(() => {
    if (savedToLinks || !card.source_url) return
    const link = createSavedLink({
      url: card.source_url,
      title: card.title,
      summary: card.summary,
      thumbnail: null,
      favicon: null,
      siteName: (() => { try { return new URL(card.source_url).hostname } catch { return '' } })(),
      type: card.card_type === 'video' ? 'video' : card.card_type === 'repo' ? 'repo' : 'article',
      tags: [],
      source: 'feed',
    })
    addLink(link)
    setSavedToLinks(true)
  }, [savedToLinks, card])

  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: isRead ? -40 : 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <DriftCard glowing={isSaved} className={cn(isRead && 'opacity-50', 'relative overflow-hidden')}>

        {/* Top type-colour accent line */}
        <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.topAccent)} />

        <div className="px-5 pt-5 pb-4 space-y-3.5">

          {/* Header row: badge · saved label · score */}
          <div className="flex items-center gap-2.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label border',
              config.bg, config.color
            )}>
              <Icon className="w-3 h-3" strokeWidth={2} />
              {config.label}
            </span>
            {isSaved && (
              <span className="text-label text-drift-accent/60 tracking-wide">· Saved</span>
            )}
            <div className="flex-1" />
            <RelevanceScore score={card.relevance_score} />
          </div>

          {/* Title */}
          <h3 className="text-h2 text-drift-text-primary leading-snug">
            {card.title}
          </h3>

          {/* Summary */}
          <p className="text-body text-drift-text-secondary leading-relaxed">
            {card.summary}
          </p>

          {/* Why it matters */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className={cn('shrink-0 mt-[3px] text-[9px] leading-none', config.color)}>◈</span>
            <p className="text-body-sm text-drift-text-secondary/75 leading-relaxed">{card.relevance_reason}</p>
          </div>

          {/* Deeper dive — streaming */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/[0.05] pt-3 pb-1">
                  <p className="text-label text-drift-text-tertiary mb-2.5">Deeper dive</p>
                  {isStreaming && !deeperText ? (
                    <div className="flex items-center gap-2 text-drift-text-tertiary">
                      <div className="w-4 h-4 rounded-full border border-drift-accent/30 border-t-drift-accent animate-spin" />
                      <span className="text-body-sm">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-body-sm text-drift-text-secondary leading-relaxed">
                      {deeperText}
                      {isStreaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-drift-accent ml-0.5 animate-pulse align-middle" />
                      )}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action row */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
            <div className={cn('flex items-center gap-2 flex-1', isRead && 'pointer-events-none')}>
              <button
                onClick={() => onAction(card.id, 'save')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all duration-200 border',
                  isSaved
                    ? 'bg-drift-accent/15 text-drift-accent border-drift-accent/30 shadow-[0_0_10px_rgba(77,217,192,0.08)]'
                    : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12]'
                )}
              >
                <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
                {isSaved ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleGoDeeper}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all duration-200 border',
                  isExpanded
                    ? 'bg-drift-accent/12 text-drift-accent border-drift-accent/25'
                    : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12]'
                )}
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
                Deeper
              </button>

              <div className="flex-1" />

              {card.source_url && (
                <>
                  <button
                    onClick={handleSaveToLinks}
                    title="Save to Links"
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg text-body-sm border transition-all duration-200',
                      savedToLinks
                        ? 'bg-drift-accent/10 text-drift-accent border-drift-accent/25'
                        : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12]'
                    )}
                  >
                    <Library className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={card.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>

            {isRead ? (
              <button
                onClick={() => onUndo(card.id)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onAction(card.id, 'read')}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all duration-200"
                title="Mark as read"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </DriftCard>
    </motion.div>
  )
}

const CACHE_KEY = 'drift_digest_cache'
const DEEPER_CACHE_KEY = 'drift_deeper_cache'

export function DigestScreen({ profile }: DigestScreenProps) {
  const [cards, setCards] = useState<DigestCard[]>([])
  const [actions, setActions] = useState<Record<string, CardAction>>({})
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [deeperCache, setDeeperCache] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Restore from sessionStorage after hydration
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) setCards(JSON.parse(cached) as DigestCard[])
    } catch { /* ignore */ }
    try {
      const cached = sessionStorage.getItem(DEEPER_CACHE_KEY)
      if (cached) setDeeperCache(JSON.parse(cached) as Record<string, string>)
    } catch { /* ignore */ }
  }, [])

  const isDone = cards.length > 0 && cards.every(c => {
    const a = actions[c.id]
    return a === 'save' || a === 'read'
  })

  const fetchDigest = useCallback(async () => {
    setIsLoading(true)
    setLoadError(false)
    setCards([])
    setActions({})
    setExpandedCards(new Set())
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { cards: DigestCard[] }
      const fetched = data.cards ?? []
      setCards(fetched)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(fetched)) } catch { /* ignore */ }
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  const handleAction = useCallback((id: string, action: CardAction) => {
    setActions(prev => ({ ...prev, [id]: action }))
  }, [])

  const handleUndo = useCallback((id: string) => {
    setActions(prev => { const next = { ...prev }; delete next[id]; return next })
  }, [])

  const handleDeeperLoaded = useCallback((id: string, text: string) => {
    setDeeperCache(prev => {
      const next = { ...prev, [id]: text }
      try { sessionStorage.setItem(DEEPER_CACHE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      {!isDone && (
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-label text-drift-text-tertiary tracking-[0.10em] mb-2">{today}</p>
              <h1 className="text-h1 text-drift-text-primary leading-none">Your Drift</h1>
              <p className="text-body-sm text-drift-text-tertiary mt-2">
                {profile.role}
                <span className="mx-1.5 opacity-30">·</span>
                {profile.stack.slice(0, 3).join(' · ')}
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={fetchDigest}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary transition-all duration-200 mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <CardSkeleton />
            </motion.div>
          ))}
        </div>
      )}

      {/* Error state */}
      {loadError && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-h3 text-drift-text-secondary mb-2">Couldn't load your digest</p>
          <p className="text-body-sm text-drift-text-tertiary mb-4">
            Check your API key in <code className="text-mono text-drift-accent">.env.local</code> and try again.
          </p>
          <button
            onClick={fetchDigest}
            className="px-4 py-2 rounded-xl text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Done state */}
      <AnimatePresence>
        {isDone && <DoneState onRefresh={fetchDigest} />}
      </AnimatePresence>

      {/* Cards */}
      {!isLoading && !isDone && cards.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-6">
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <DigestCardItem
                  card={card}
                  profile={profile}
                  action={actions[card.id]}
                  isExpanded={expandedCards.has(card.id)}
                  cachedDeeperText={deeperCache[card.id]}
                  onAction={handleAction}
                  onUndo={handleUndo}
                  onToggleExpand={handleToggleExpand}
                  onDeeperLoaded={handleDeeperLoaded}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && cards.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-2xl p-8 text-center"
        >
          <p className="text-body text-drift-text-secondary mb-2">
            Ready to load your digest
          </p>
          <p className="text-body-sm text-drift-text-tertiary mb-4">
            Click below to fetch today&apos;s personalized feed.
          </p>
          <button
            onClick={fetchDigest}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Load digest
          </button>
        </motion.div>
      )}
    </div>
  )
}
