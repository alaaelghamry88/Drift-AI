'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, X, ChevronDown, ExternalLink,
  Zap, BookOpen, Play, GitBranch, Lightbulb, RefreshCw
} from 'lucide-react'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard, DigestState, CardAction } from '@/types/digest'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { DoneState } from '@/components/digest/done-state'
import { useStreaming } from '@/hooks/use-streaming'
import { cn } from '@/lib/utils'

interface DigestScreenProps {
  profile: DriftProfile
}

const CARD_TYPE_CONFIG = {
  tool_release: {
    icon: Zap,
    label: 'Tool Release',
    color: 'text-drift-gold',
    bg: 'bg-drift-gold/10 border-drift-gold/20',
    accentBar: 'bg-gradient-to-b from-drift-gold/80 via-drift-gold/50 to-transparent',
  },
  article: {
    icon: BookOpen,
    label: 'Article',
    color: 'text-drift-accent',
    bg: 'bg-drift-accent/10 border-drift-accent/20',
    accentBar: 'bg-gradient-to-b from-drift-accent/80 via-drift-accent/50 to-transparent',
  },
  video: {
    icon: Play,
    label: 'Video',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    accentBar: 'bg-gradient-to-b from-purple-400/80 via-purple-400/50 to-transparent',
  },
  repo: {
    icon: GitBranch,
    label: 'Repo',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    accentBar: 'bg-gradient-to-b from-blue-400/80 via-blue-400/50 to-transparent',
  },
  skill: {
    icon: Lightbulb,
    label: 'Skill',
    color: 'text-drift-gold',
    bg: 'bg-drift-gold/10 border-drift-gold/20',
    accentBar: 'bg-gradient-to-b from-drift-gold/80 via-drift-gold/50 to-transparent',
  },
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-drift-surface p-6 space-y-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-white/[0.06] rounded-full w-20" />
          <div className="h-4 bg-white/[0.08] rounded-full w-3/4" />
          <div className="h-4 bg-white/[0.06] rounded-full w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.06] rounded-full" />
        <div className="h-3 bg-white/[0.06] rounded-full w-5/6" />
        <div className="h-3 bg-white/[0.06] rounded-full w-4/6" />
      </div>
      <div className="h-10 bg-white/[0.04] rounded-xl" />
      <div className="flex gap-2">
        <div className="h-8 bg-white/[0.06] rounded-lg w-20" />
        <div className="h-8 bg-white/[0.06] rounded-lg w-24" />
      </div>
    </div>
  )
}

function DigestCardItem({
  card,
  profile,
  action,
  isExpanded,
  onAction,
  onToggleExpand,
}: {
  card: DigestCard
  profile: DriftProfile
  action?: CardAction
  isExpanded: boolean
  onAction: (id: string, action: CardAction) => void
  onToggleExpand: (id: string) => void
}) {
  const config = CARD_TYPE_CONFIG[card.card_type] ?? CARD_TYPE_CONFIG.article
  const Icon = config.icon
  const { text: deeperText, isStreaming, stream, reset } = useStreaming()

  const handleGoDeeper = useCallback(async () => {
    if (isExpanded) {
      onToggleExpand(card.id)
      reset()
      return
    }
    onToggleExpand(card.id)
    await stream(() =>
      fetch('/api/deeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, card }),
      })
    )
  }, [isExpanded, card, profile, onToggleExpand, stream, reset])

  const isSaved = action === 'save'
  const isSkipped = action === 'skip'

  return (
    <motion.div
      layout
      exit={{ opacity: 0, x: isSkipped ? -40 : 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <DriftCard glowing={isSaved} className={cn(isSkipped && 'opacity-40 pointer-events-none', 'relative overflow-hidden pl-8')}>
        {/* Left type accent strip */}
        <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', config.accentBar)} />

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <RelevanceScore score={card.relevance_score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-label border',
                config.bg, config.color
              )}>
                <Icon className="w-3 h-3" strokeWidth={1.5} />
                {config.label}
              </span>
              {isSaved && (
                <span className="text-label text-drift-accent">· Saved</span>
              )}
            </div>
            <h3 className="text-h3 text-drift-text-primary leading-snug">
              {card.title}
            </h3>
          </div>
        </div>

        {/* Summary */}
        <p className="text-body-sm text-drift-text-secondary mb-3 leading-relaxed">
          {card.summary}
        </p>

        {/* Relevance reason */}
        <div className="flex items-start gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <span className={cn('shrink-0 mt-0.5 text-[10px] leading-none opacity-70', config.color)}>◈</span>
          <p className="text-body-sm text-drift-text-secondary leading-relaxed">{card.relevance_reason}</p>
        </div>

        {/* Deeper content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] pt-3 pb-1 mb-4">
                <p className="text-label text-drift-text-tertiary mb-2">Deeper dive</p>
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction(card.id, 'save')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all duration-200 border',
              isSaved
                ? 'bg-drift-accent/20 text-drift-accent border-drift-accent/30'
                : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.06] hover:bg-white/[0.08] hover:text-drift-text-secondary'
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
                ? 'bg-drift-accent/15 text-drift-accent border-drift-accent/20'
                : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.06] hover:bg-white/[0.08] hover:text-drift-text-secondary'
            )}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
            Go deeper
          </button>

          <div className="flex-1" />

          {card.source_url && (
            <a
              href={card.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.06] hover:bg-white/[0.08] hover:text-drift-text-secondary transition-all duration-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => onAction(card.id, 'skip')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.06] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </DriftCard>
    </motion.div>
  )
}

export function DigestScreen({ profile }: DigestScreenProps) {
  const [cards, setCards] = useState<DigestCard[]>([])
  const [actions, setActions] = useState<Record<string, CardAction>>({})
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Done when all cards have save/skip action
  const isDone = cards.length > 0 && cards.every(c => {
    const a = actions[c.id]
    return a === 'save' || a === 'skip'
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
      setCards(data.cards ?? [])
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchDigest()
  }, [fetchDigest])

  const handleAction = useCallback((id: string, action: CardAction) => {
    setActions(prev => ({ ...prev, [id]: action }))
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
        <div className="mb-2">
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
            {!isLoading && cards.length > 0 && (
              <button
                onClick={fetchDigest}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.06] hover:bg-white/[0.08] hover:text-drift-text-secondary transition-all duration-200 mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Gradient rule — teal accent fading right */}
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

      {/* Done state — all cards actioned */}
      <AnimatePresence>
        {isDone && <DoneState onRefresh={fetchDigest} />}
      </AnimatePresence>

      {/* Cards */}
      {!isLoading && !isDone && cards.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
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
                  onAction={handleAction}
                  onToggleExpand={handleToggleExpand}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Empty state — first visit, no cards yet */}
      {!isLoading && !loadError && cards.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-drift-surface p-8 text-center"
        >
          <p className="text-body text-drift-text-secondary mb-2">
            No digest items generated.
          </p>
          <p className="text-body-sm text-drift-text-tertiary mb-4">
            Make sure your ANTHROPIC_API_KEY is set correctly.
          </p>
          <button
            onClick={fetchDigest}
            className="px-4 py-2 rounded-xl text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
          >
            Try again
          </button>
        </motion.div>
      )}
    </div>
  )
}
