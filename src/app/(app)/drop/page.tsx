// src/app/(app)/drop/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight, ExternalLink, Bookmark, RefreshCw, Trash2 } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { useStreaming } from '@/hooks/use-streaming'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { cn } from '@/lib/utils'
import type { LinkAssessment, StoredLinkAssessment } from '@/types/verdict'

const HISTORY_KEY = 'drift_drop_history'
const MAX_HISTORY = 50

function loadHistory(): StoredLinkAssessment[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as StoredLinkAssessment[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: StoredLinkAssessment[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {
    // localStorage unavailable
  }
}

export default function DropPage() {
  return <DropPageContent />
}

const VERDICT_CONFIG = {
  worth_your_time: {
    label: 'Worth Your Time',
    className: 'text-drift-accent bg-drift-accent/10 border-drift-accent/25',
    accent: 'bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent',
  },
  save_for_later: {
    label: 'Save For Later',
    className: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    accent: 'bg-gradient-to-r from-amber-400/70 via-amber-400/20 to-transparent',
  },
  skip: {
    label: 'Skip',
    className: 'text-white/40 bg-white/[0.04] border-white/[0.07]',
    accent: 'bg-gradient-to-r from-white/20 via-white/5 to-transparent',
  },
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  article: 'Article',
  repo: 'Repo',
  post: 'Post',
  other: 'Link',
}

function DropPageContent() {
  const { profile } = useProfile()
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('url') ?? ''

  const [inputValue, setInputValue] = useState(urlParam)
  const [inputError, setInputError] = useState('')
  const [history, setHistory] = useState<StoredLinkAssessment[]>(() => loadHistory())
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  const { text: streamText, isStreaming, error: streamError, stream, reset } = useStreaming()
  const hasTriggered = useRef(false)

  const triggerAssessment = useCallback(async (url: string) => {
    if (!profile) return

    // Use cached result if URL was already assessed
    const cached = history.find(item => item.url === url)
    if (cached) {
      setHistory(prev => {
        const next = [cached, ...prev.filter(item => item.url !== url)]
        saveHistory(next)
        return next
      })
      setInputValue('')
      return
    }

    setPendingUrl(url)
    reset()

    const result = await stream(
      () => fetch('/api/link-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, url }),
      }),
      {
        onDone: (data) => {
          const assessment = data as LinkAssessment
          const stored: StoredLinkAssessment = { ...assessment, url, assessedAt: new Date().toISOString() }
          setHistory(prev => {
            const next = [stored, ...prev].slice(0, MAX_HISTORY)
            saveHistory(next)
            return next
          })
          setPendingUrl(null)
          setInputValue('')
        },
      }
    )

    // If streaming finished but onDone never fired (no JSON found), clear pending
    if (result !== undefined) setPendingUrl(null)
  }, [profile, history, stream, reset])

  // Auto-trigger from ?url= param
  useEffect(() => {
    if (urlParam && !hasTriggered.current) {
      hasTriggered.current = true
      triggerAssessment(urlParam)
    }
  }, [urlParam, triggerAssessment])

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
    } catch {
      setInputError('Please enter a valid URL (e.g. https://example.com)')
      return
    }
    setInputError('')
    triggerAssessment(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const handleToggleSave = (url: string) => {
    setHistory(prev => {
      const next = prev.map(item =>
        item.url === url ? { ...item, save_to_digest: !item.save_to_digest } : item
      )
      saveHistory(next)
      return next
    })
  }

  const handleRemove = (assessedAt: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.assessedAt !== assessedAt)
      saveHistory(next)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-h1 text-drift-text-primary leading-none">Link Drop</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-2">
          Paste any URL — Drift will read it and tell you if it&apos;s worth your time.
        </p>
        <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Input bar */}
      <motion.div
        animate={{
          boxShadow: isStreaming
            ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
            : '0 0 0 1px rgba(255,255,255,0.06)'
        }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-drift-surface backdrop-blur-xl overflow-hidden"
      >
        <div className={cn('flex items-center gap-3 px-4 py-3.5', isStreaming && 'opacity-60 pointer-events-none')}>
          <Link2 className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setInputError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a URL to assess..."
            className="flex-1 bg-transparent text-body text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
          />
          <AnimatePresence>
            {inputValue.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 text-label text-drift-accent px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20 transition-colors duration-200 shrink-0"
              >
                Assess
                <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {inputError && (
          <p className="px-4 pb-3 text-label text-red-400">{inputError}</p>
        )}
      </motion.div>

      {/* Streaming card */}
      <AnimatePresence>
        {(isStreaming || streamError) && pendingUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <StreamingCard
              url={pendingUrl}
              text={streamText}
              error={streamError}
              onRetry={() => triggerAssessment(pendingUrl)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History list */}
      <AnimatePresence mode="popLayout">
        {history.map((item, i) => (
          <motion.div
            key={item.assessedAt}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <VerdictCard item={item} onToggleSave={handleToggleSave} onRemove={handleRemove} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!isStreaming && !streamError && history.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-body text-drift-text-secondary mb-1">No links dropped yet.</p>
          <p className="text-body-sm text-drift-text-tertiary">Paste any URL above to assess it.</p>
        </motion.div>
      )}
    </div>
  )
}

function StreamingCard({ url, text, error, onRetry }: {
  url: string
  text: string
  error: string | null
  onRetry: () => void
}) {
  return (
    <DriftCard className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-drift-accent/70 via-drift-accent/20 to-transparent animate-pulse" />
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2.5">
          {error ? (
            <span className="text-label text-red-400">Assessment failed</span>
          ) : (
            <>
              <div className="w-4 h-4 rounded-full border border-drift-accent/30 border-t-drift-accent animate-spin" />
              <span className="text-label text-drift-text-tertiary">Analyzing...</span>
            </>
          )}
        </div>
        <p className="text-label text-drift-text-tertiary truncate">{url.length > 60 ? url.slice(0, 60) + '…' : url}</p>
        {error ? (
          <div className="space-y-2">
            <p className="text-body-sm text-drift-text-secondary">
              Assessment failed. Check your API key or try again.
            </p>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-all duration-200"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        ) : text ? (
          <p className="text-body-sm text-drift-text-secondary leading-relaxed">
            {text}
            <span className="inline-block w-0.5 h-3.5 bg-drift-accent ml-0.5 animate-pulse align-middle" />
          </p>
        ) : null}
      </div>
    </DriftCard>
  )
}

function VerdictCard({ item, onToggleSave, onRemove }: {
  item: StoredLinkAssessment
  onToggleSave: (url: string) => void
  onRemove: (assessedAt: string) => void
}) {
  const [saved, setSaved] = useState(item.save_to_digest)
  const config = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.skip
  const contentTypeLabel = CONTENT_TYPE_LABELS[item.content_type] ?? 'Link'
  const truncatedUrl = item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url

  const handleToggle = () => {
    setSaved(prev => !prev)
    onToggleSave(item.url)
  }

  return (
    <DriftCard className="relative overflow-hidden">
      {/* Top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px]', config.accent)} />

      <div className="px-5 pt-5 pb-4 space-y-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-label border bg-white/[0.04] border-white/[0.10] text-drift-text-secondary">
            {contentTypeLabel}
          </span>
          <div className="flex-1" />
          <RelevanceScore score={item.relevance_score} />
        </div>

        {/* URL subtitle */}
        <p className="text-label text-drift-text-tertiary truncate">{truncatedUrl}</p>

        {/* Title */}
        <h3 className="text-h2 text-drift-text-primary leading-snug">{item.title}</h3>

        {/* Summary */}
        <p className="text-body text-drift-text-secondary leading-relaxed">{item.summary}</p>

        {/* Verdict pill */}
        <div className={cn(
          'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-body-sm font-medium',
          config.className
        )}>
          {config.label}
        </div>

        {/* Verdict reason */}
        <p className="text-body-sm text-drift-text-secondary leading-relaxed">{item.verdict_reason}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm transition-all duration-200 border',
              saved
                ? 'bg-drift-accent/15 text-drift-accent border-drift-accent/30'
                : 'bg-white/[0.04] text-drift-text-tertiary border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12]'
            )}
          >
            <Bookmark className={cn('w-3.5 h-3.5', saved && 'fill-current')} />
            {saved ? 'Saved to digest' : 'Save to digest'}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-white/[0.08] hover:text-drift-text-secondary hover:border-white/[0.12] transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
          <div className="flex-1" />
          <button
            onClick={() => onRemove(item.assessedAt)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-drift-text-tertiary border border-white/[0.07] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </DriftCard>
  )
}
