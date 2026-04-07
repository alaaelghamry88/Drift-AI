'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Bookmark, Eye, RotateCcw, ChevronDown, ExternalLink,
  Zap, BookOpen, Play, GitBranch, Lightbulb, RefreshCw, Library, ArrowRight, Pencil, X
} from 'lucide-react'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard, CardAction } from '@/types/digest'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { DoneState } from '@/components/digest/done-state'
import { useStreaming } from '@/hooks/use-streaming'
import { addLink, createSavedLink } from '@/lib/saved-links'
import { cn } from '@/lib/utils'

const CACHE_KEY = 'drift_digest_v2'
const DEEPER_CACHE_KEY = 'drift_deeper_cache'
const ACTIONS_SESSION_KEY = 'drift_digest_actions'
const DISMISSED_KEY = 'drift_dismissed_ids'

const CARD_TYPE_CONFIG = {
  tool_release: {
    icon: Zap,
    label: 'Tool Release',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    topAccent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
    whyBg: 'bg-amber-400/[0.06] border-amber-400/[0.14]',
  },
  article: {
    icon: BookOpen,
    label: 'Article',
    color: 'text-drift-accent',
    bg: 'bg-drift-accent/10 border-drift-accent/25',
    topAccent: 'bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent',
    whyBg: 'bg-drift-accent/[0.06] border-drift-accent/[0.14]',
  },
  video: {
    icon: Play,
    label: 'Video',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/25',
    topAccent: 'bg-gradient-to-r from-violet-400/70 via-violet-400/20 to-transparent',
    whyBg: 'bg-violet-400/[0.06] border-violet-400/[0.14]',
  },
  repo: {
    icon: GitBranch,
    label: 'Repo',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/25',
    topAccent: 'bg-gradient-to-r from-sky-400/70 via-sky-400/20 to-transparent',
    whyBg: 'bg-sky-400/[0.06] border-sky-400/[0.14]',
  },
  skill: {
    icon: Lightbulb,
    label: 'Skill',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
    topAccent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
    whyBg: 'bg-amber-400/[0.06] border-amber-400/[0.14]',
  },
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function loadDigestCache(): { today: DigestCard[] | null; yesterday: DigestCard[] | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { today: null, yesterday: null }
    const all = JSON.parse(raw) as Record<string, DigestCard[]>
    return { today: all[todayKey()] ?? null, yesterday: all[yesterdayKey()] ?? null }
  } catch {
    return { today: null, yesterday: null }
  }
}

function saveDigestToCache(cards: DigestCard[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, DigestCard[]>) : {}
    const pruned: Record<string, DigestCard[]> = {}
    const yk = yesterdayKey()
    if (all[yk]) pruned[yk] = all[yk]
    pruned[todayKey()] = cards
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned))
  } catch { /* ignore */ }
}

// Use source_url or title as a stable key — AI regenerates IDs on each fetch
function cardStableKey(card: DigestCard): string {
  return card.source_url || card.title
}

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function persistDismissedId(key: string) {
  try {
    const existing = loadDismissedIds()
    existing.add(key)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...existing]))
  } catch { /* ignore */ }
}

function computeShiftBanner(current: DigestCard[], previous: DigestCard[]): string | null {
  const prevTitles = new Set(previous.map(c => c.title.toLowerCase()))
  const newCount = current.filter(c => !prevTitles.has(c.title.toLowerCase())).length
  if (newCount === 0) return null
  if (newCount === current.length) return `Fresh digest — all ${newCount} items are new today.`
  return `${newCount} of ${current.length} items are new since yesterday.`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Hero Card — Today's One Thing ────────────────────────────────────────────

function HeroCard({ card, action, onAction, onDismiss }: {
  card: DigestCard
  action?: CardAction
  onAction: (id: string, action: CardAction) => void
  onDismiss: (id: string) => void
}) {
  const config = CARD_TYPE_CONFIG[card.card_type] ?? CARD_TYPE_CONFIG.article
  const Icon = config.icon
  const isDone = action === 'read' || action === 'save'

  const handleSaveToLinks = useCallback(() => {
    if (!card.source_url) return
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
  }, [card])

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-drift-accent/25 bg-[#0a1410] shadow-[0_0_40px_rgba(77,217,192,0.06),inset_0_1px_0_rgba(77,217,192,0.08)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-drift-accent/80 via-drift-accent/30 to-transparent" />
          <div className="px-5 pt-5 pb-4 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-label text-drift-accent/70 tracking-[0.10em] uppercase">◈ Today's focus</span>
              <div className="flex-1" />
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label border', config.bg, config.color)}>
                <Icon className="w-3 h-3" strokeWidth={2} />
                {config.label}
              </span>
            </div>
            <h2 className="text-h1 text-drift-text-primary leading-snug">{card.title}</h2>
            <p className="text-body text-drift-text-secondary leading-relaxed">{card.summary}</p>
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-drift-accent/[0.04] border border-drift-accent/[0.10]">
              <span className="shrink-0 mt-[3px] text-[9px] leading-none text-drift-accent">◈</span>
              <p className="text-body-sm text-drift-text-secondary/75 leading-relaxed">{card.relevance_reason}</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-drift-accent/[0.08]">
              <button
                onClick={() => onAction(card.id, 'read')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200 font-medium"
              >
                On it
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => onAction(card.id, 'save')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary transition-all duration-200"
              >
                <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                Save
              </button>
              <div className="flex-1" />
              {card.source_url && (
                <a
                  href={card.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => onDismiss(card.id)}
                title="Dismiss"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Digest Card Item ─────────────────────────────────────────────────────────

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
  onSwipeDismiss,
  onDismiss,
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
  onSwipeDismiss: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const config = CARD_TYPE_CONFIG[card.card_type] ?? CARD_TYPE_CONFIG.article
  const Icon = config.icon
  const { text: streamedText, isStreaming, stream } = useStreaming()
  const deeperText = cachedDeeperText ?? streamedText

  const handleGoDeeper = useCallback(async () => {
    if (isExpanded) { onToggleExpand(card.id); return }
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
  const isActioned = isSaved || isRead
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

  // Swipe to triage
  const x = useMotionValue(0)
  const saveOpacity = useTransform(x, [30, 90], [0, 1])
  const readOpacity = useTransform(x, [-30, -90], [0, 1])

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.x > 80) {
      handleSaveToLinks()
      onAction(card.id, 'save')
      animate(x, 600, { duration: 0.2, ease: [0.4, 0, 1, 1] })
      setTimeout(() => onSwipeDismiss(card.id), 200)
    } else if (info.offset.x < -80) {
      onAction(card.id, 'read')
      animate(x, -600, { duration: 0.2, ease: [0.4, 0, 1, 1] })
      setTimeout(() => onSwipeDismiss(card.id), 200)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }, [card.id, onAction, onSwipeDismiss, x])

  return (
    <motion.div
      layout
      drag={isActioned ? false : 'x'}
      dragConstraints={{ left: -200, right: 200 }}
      dragElastic={0}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ x }}
      exit={{ opacity: 0, x: isRead ? -40 : 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('relative touch-pan-y select-none', !isActioned && 'cursor-grab active:cursor-grabbing')}
    >
      <DriftCard glowing={isSaved} className={cn(isRead && 'opacity-50', 'relative overflow-hidden')}>
        <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.topAccent)} />
        <div className="px-5 pt-5 pb-4 space-y-3.5">

          {/* Header row */}
          <div className="flex items-center gap-2.5">
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label border', config.bg, config.color)}>
              <Icon className="w-3 h-3" strokeWidth={2} />
              {config.label}
            </span>
            {isSaved && <span className="text-label text-drift-accent/60 tracking-wide">· Saved</span>}
            <div className="flex-1" />
            <RelevanceScore score={card.relevance_score} />
          </div>

          {/* Title */}
          <h3 className="text-h2 text-drift-text-primary leading-snug">{card.title}</h3>

          {/* Summary */}
          <p className="text-body text-drift-text-secondary leading-relaxed">{card.summary}</p>

          {/* Why it matters */}
          <div className={cn('flex items-start gap-2.5 px-3.5 py-3 rounded-xl border', config.whyBg)}>
            <span className={cn('shrink-0 mt-[3px] text-[9px] leading-none', config.color)}>◈</span>
            <p className="text-body-sm text-drift-text-secondary/75 leading-relaxed">{card.relevance_reason}</p>
          </div>

          {/* Deeper dive */}
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
                onClick={() => isSaved ? onUndo(card.id) : onAction(card.id, 'save')}
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

            {!isActioned && (
              <button
                onClick={() => onDismiss(card.id)}
                title="Dismiss"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isRead ? (
              <button
                onClick={() => onUndo(card.id)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : (
              !isActioned && (
                <button
                  onClick={() => onAction(card.id, 'read')}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all duration-200"
                  title="Mark as read"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>

        </div>
      </DriftCard>

      {/* Swipe hints — rendered after DriftCard so they sit on top */}
      <motion.span
        style={{ opacity: saveOpacity }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-label text-drift-accent font-medium pointer-events-none select-none z-10"
      >
        Save →
      </motion.span>
      <motion.span
        style={{ opacity: readOpacity }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-label text-blue-400 font-medium pointer-events-none select-none z-10"
      >
        ← Done
      </motion.span>
    </motion.div>
  )
}

// ─── Digest Screen ─────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface DigestScreenProps {
  profile: DriftProfile
  onUpdateContext: (ctx: string) => void
  contextUpdatedAt: string
}

export function DigestScreen({ profile, onUpdateContext, contextUpdatedAt }: DigestScreenProps) {
  const [cards, setCards] = useState<DigestCard[]>([])
  const [actions, setActions] = useState<Record<string, CardAction>>({})
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [deeperCache, setDeeperCache] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [shiftBanner, setShiftBanner] = useState<string | null>(null)
  const [rerankLabel, setRerankLabel] = useState<string | null>(null)
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isEditingContext, setIsEditingContext] = useState(false)
  const [contextDraft, setContextDraft] = useState(profile.currentContext)

  // Refs for context pulse
  const prevContextRef = useRef(profile.currentContext)
  const fetchDigestRef = useRef<(() => Promise<void>) | undefined>(undefined)
  const cardsRef = useRef(cards)
  useEffect(() => { cardsRef.current = cards }, [cards])

  // Restore from localStorage on mount
  useEffect(() => {
    const { today } = loadDigestCache()
    if (today) setCards(today)
    setDismissedIds(loadDismissedIds())
    try {
      const cachedActions = sessionStorage.getItem(ACTIONS_SESSION_KEY)
      if (cachedActions) setActions(JSON.parse(cachedActions) as Record<string, CardAction>)
      const cached = sessionStorage.getItem(DEEPER_CACHE_KEY)
      if (cached) setDeeperCache(JSON.parse(cached) as Record<string, string>)
    } catch { /* ignore */ }
  }, [])

  // Persist actions so they survive tab navigation
  // Guard against empty object to avoid overwriting stored data on initial render
  useEffect(() => {
    if (Object.keys(actions).length === 0) return
    try {
      sessionStorage.setItem(ACTIONS_SESSION_KEY, JSON.stringify(actions))
    } catch { /* ignore */ }
  }, [actions])

  const isDone = cards.length > 0 && cards.every(c => {
    const a = actions[c.id]
    return a === 'save' || a === 'read' || dismissedIds.has(cardStableKey(c))
  })

  const fetchDigest = useCallback(async () => {
    setIsLoading(true)
    setLoadError(false)
    setCards([])
    setActions({})
    try { sessionStorage.removeItem(ACTIONS_SESSION_KEY) } catch { /* ignore */ }
    setExpandedCards(new Set())
    setSwipedIds(new Set())
    setShiftBanner(null)
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { cards: DigestCard[] }
      const dismissed = loadDismissedIds()
      const fetched = (data.cards ?? []).filter(c => !dismissed.has(cardStableKey(c)))
      setCards(fetched)
      // What shifted banner
      const { yesterday } = loadDigestCache()
      saveDigestToCache(fetched)
      if (yesterday) setShiftBanner(computeShiftBanner(fetched, yesterday))
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
      setRerankLabel(null)
    }
  }, [profile])

  // Keep ref in sync
  useEffect(() => { fetchDigestRef.current = fetchDigest }, [fetchDigest])

  // Context pulse — re-fetch when currentContext changes
  useEffect(() => {
    if (prevContextRef.current === profile.currentContext) return
    prevContextRef.current = profile.currentContext
    if (cardsRef.current.length === 0) return
    setRerankLabel('Re-ranking for your new context…')
    const timer = setTimeout(() => { fetchDigestRef.current?.() }, 500)
    return () => clearTimeout(timer)
  }, [profile.currentContext])

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

  const handleSwipeDismiss = useCallback((id: string) => {
    setSwipedIds(prev => new Set([...prev, id]))
  }, [])

  const handleDismiss = useCallback((id: string) => {
    const card = cards.find(c => c.id === id)
    if (!card) return
    const key = cardStableKey(card)
    persistDismissedId(key)
    setDismissedIds(prev => new Set([...prev, key]))
  }, [cards])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Hero card — highest relevance_score card
  const visibleCards = cards.filter(c => !swipedIds.has(c.id) && !dismissedIds.has(cardStableKey(c)))
  const heroCard = visibleCards.length > 0
    ? visibleCards.reduce((a, b) => a.relevance_score >= b.relevance_score ? a : b)
    : null
  const restCards = visibleCards.filter(c => c.id !== heroCard?.id)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      {!isDone && (
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-label text-drift-text-tertiary tracking-[0.18em] mb-3">{today}</p>
              <h1 className="text-h1 text-drift-text-primary leading-none">Your Drift</h1>
              <div className="flex items-center gap-1.5 mt-2">
                {isEditingContext ? (
                  <input
                    autoFocus
                    value={contextDraft}
                    onChange={e => setContextDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        onUpdateContext(contextDraft.trim() || profile.currentContext)
                        setIsEditingContext(false)
                      }
                      if (e.key === 'Escape') {
                        setContextDraft(profile.currentContext)
                        setIsEditingContext(false)
                      }
                    }}
                    onBlur={() => {
                      onUpdateContext(contextDraft.trim() || profile.currentContext)
                      setIsEditingContext(false)
                    }}
                    className="bg-transparent text-body-sm text-drift-text-primary outline-none placeholder:text-drift-text-tertiary w-full"
                    placeholder="What are you building right now?"
                  />
                ) : Date.now() - new Date(contextUpdatedAt).getTime() > SEVEN_DAYS_MS ? (
                  <button
                    onClick={() => { setContextDraft(profile.currentContext); setIsEditingContext(true) }}
                    className="text-body-sm text-amber-400 hover:text-amber-300 transition-colors duration-200"
                  >
                    Update your focus →
                  </button>
                ) : (
                  <>
                    <span className="text-body-sm text-drift-text-tertiary truncate flex-1">
                      {profile.currentContext.length > 60
                        ? profile.currentContext.slice(0, 57) + '…'
                        : profile.currentContext}
                    </span>
                    <button
                      onClick={() => { setContextDraft(profile.currentContext); setIsEditingContext(true) }}
                      className="text-drift-text-tertiary hover:text-drift-accent transition-colors duration-200 shrink-0"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>
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

          {/* What shifted / rerank banners */}
          <AnimatePresence mode="wait">
            {rerankLabel ? (
              <motion.p
                key="rerank"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-label text-drift-accent/60 mt-2"
              >
                ◈ {rerankLabel}
              </motion.p>
            ) : shiftBanner ? (
              <motion.p
                key="shift"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-label text-drift-text-tertiary mt-2"
              >
                ◈ {shiftBanner}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6">
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
        <div>
          {/* Hero card — primary focus */}
          {heroCard && (
            <div className={restCards.length > 0 ? 'mb-8' : undefined}>
              <HeroCard
                key={heroCard.id}
                card={heroCard}
                action={actions[heroCard.id]}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            </div>
          )}

          {/* Rest of cards — tighter rhythm, secondary priority */}
          {restCards.length > 0 && (
            <div className="space-y-4">
              {heroCard && (
                <p className="text-label text-drift-text-tertiary px-0.5">More in your feed</p>
              )}
              <AnimatePresence mode="popLayout">
                {restCards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -8 }}
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
                      onSwipeDismiss={handleSwipeDismiss}
                      onDismiss={handleDismiss}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
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
