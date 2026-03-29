'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Edit2, RefreshCw, RotateCcw, Zap, Clock, TrendingUp, Flame } from 'lucide-react'
import { useProfile } from '@/hooks/use-profile'
import { DriftCard } from '@/components/ui/drift-card'
import { cn } from '@/lib/utils'
import { getWeeklyStats, getCurrentStreak } from '@/lib/activity-log'
import type { WeeklyStats } from '@/lib/activity-log'

// ─── Types ─────────────────────────────────────────────────────────────────

type Effort = 'Quick Win' | 'Medium Lift' | 'Long Term'

interface Recommendation {
  title: string
  description: string
  tool: string
  effort: Effort
  why_now: string
}

interface WorkflowAssessment {
  summary: string
  recommendations: Recommendation[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ASSESSMENT_CACHE_KEY = 'drift_workflow_assessment'

const EFFORT_CONFIG: Record<Effort, {
  label: string
  icon: React.ElementType
  pillClass: string
  accent: string
}> = {
  'Quick Win': {
    label: 'Quick Win',
    icon: Zap,
    pillClass: 'text-drift-accent bg-drift-accent/[0.10] border-drift-accent/30',
    accent: 'border-drift-accent/20',
  },
  'Medium Lift': {
    label: 'Medium Lift',
    icon: Clock,
    pillClass: 'text-amber-400 bg-amber-400/[0.08] border-amber-400/25',
    accent: 'border-amber-400/20',
  },
  'Long Term': {
    label: 'Long Term',
    icon: TrendingUp,
    pillClass: 'text-violet-400 bg-violet-400/[0.08] border-violet-400/25',
    accent: 'border-violet-400/20',
  },
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return <ProfilePageContent />
}

function ProfilePageContent() {
  const { profile, updateContext } = useProfile()
  const router = useRouter()

  const [isEditingContext, setIsEditingContext] = useState(false)
  const [contextDraft, setContextDraft] = useState('')
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ linksSaved: 0, linksTriaged: 0, verdictsMade: 0 })
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setWeeklyStats(getWeeklyStats())
    setStreak(getCurrentStreak())
  }, [])

  const [assessment, setAssessment] = useState<WorkflowAssessment | null>(() => {
    try {
      const cached = localStorage.getItem(ASSESSMENT_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)

  const fetchAssessment = useCallback(async (force = false) => {
    if (!profile) return
    if (assessment && !force) return

    setIsLoadingAssessment(true)
    setAssessmentError(null)

    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error('Failed to generate assessment')
      const data = await res.json() as WorkflowAssessment
      setAssessment(data)
      try { localStorage.setItem(ASSESSMENT_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
    } catch {
      setAssessmentError('Could not load assessment. Try again.')
    } finally {
      setIsLoadingAssessment(false)
    }
  }, [profile, assessment])

  useEffect(() => {
    if (profile && !assessment) fetchAssessment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const handleStartEdit = () => {
    setContextDraft(profile?.currentContext ?? '')
    setIsEditingContext(true)
  }

  const handleSaveContext = () => {
    const trimmed = contextDraft.trim()
    if (trimmed) updateContext(trimmed)
    setIsEditingContext(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveContext() }
    if (e.key === 'Escape') setIsEditingContext(false)
  }

  const handleRerunProfiler = () => {
    router.push('/stack')
  }

  if (!profile) return null

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-h1 text-drift-text-primary leading-none">Profile</h1>
        <p className="text-body-sm text-drift-text-tertiary mt-2">
          Your Drift context — how we filter everything for you.
        </p>
        <div className="mt-5 h-px bg-gradient-to-r from-drift-accent/30 via-white/[0.05] to-transparent" />
      </div>

      {/* Drift Profile card */}
      <DriftCard>
        <div className="px-6 py-5 space-y-5">
          {/* Role + streak */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-drift-accent/10 border border-drift-accent/25 flex items-center justify-center shrink-0">
              <span className="text-drift-accent text-base" style={{ fontFamily: 'var(--font-heading)' }}>∿</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label text-drift-text-tertiary uppercase tracking-wide mb-0.5">Role</p>
              <p className="text-body font-medium text-drift-text-primary">{profile.role}</p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/[0.08] border border-amber-400/20 shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                <span className="text-label text-amber-400 font-medium">{streak}d</span>
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.05]" />

          {/* Stack */}
          <div className="space-y-2.5">
            <p className="text-label text-drift-text-tertiary uppercase tracking-wide">Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.stack.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-body border bg-white/[0.04] border-white/[0.08] text-drift-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.05]" />

          {/* Current Context — editable */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-label text-drift-text-tertiary uppercase tracking-wide">Currently Building</p>
              {!isEditingContext && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 text-label text-drift-text-tertiary hover:text-drift-accent transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-drift-accent/[0.06]"
                >
                  <Edit2 className="w-3 h-3" strokeWidth={1.5} />
                  Edit
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isEditingContext ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  <textarea
                    autoFocus
                    value={contextDraft}
                    onChange={e => setContextDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl resize-none',
                      'bg-drift-surface border border-drift-accent/30',
                      'text-body text-drift-text-primary placeholder:text-drift-text-tertiary',
                      'outline-none focus:border-drift-accent/50 transition-colors'
                    )}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveContext}
                      disabled={!contextDraft.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-drift-accent text-[#0a0f1a] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingContext(false)}
                      className="px-3 py-1.5 rounded-lg text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary bg-white/[0.04] border border-white/[0.07] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-body text-drift-text-secondary leading-relaxed"
                >
                  {profile.currentContext}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DriftCard>

      {/* Weekly stats strip */}
      <DriftCard>
        <div className="px-6 py-4">
          <p className="text-label text-drift-text-tertiary uppercase tracking-wide mb-3">This week</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-h2 text-drift-text-primary font-semibold leading-none">{weeklyStats.linksSaved}</p>
              <p className="text-label text-drift-text-tertiary mt-1">saved</p>
            </div>
            <div className="text-center border-x border-white/[0.06]">
              <p className="text-h2 text-drift-text-primary font-semibold leading-none">{weeklyStats.linksTriaged}</p>
              <p className="text-label text-drift-text-tertiary mt-1">triaged</p>
            </div>
            <div className="text-center">
              <p className="text-h2 text-drift-text-primary font-semibold leading-none">{weeklyStats.verdictsMade}</p>
              <p className="text-label text-drift-text-tertiary mt-1">verdicts</p>
            </div>
          </div>
        </div>
      </DriftCard>

      {/* AI Workflow Assessment */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-drift-text-primary">AI Workflow Assessment</h2>
          {assessment && !isLoadingAssessment && (
            <button
              onClick={() => {
                setAssessment(null)
                try { localStorage.removeItem(ASSESSMENT_CACHE_KEY) } catch { /* ignore */ }
                fetchAssessment(true)
              }}
              className="flex items-center gap-1.5 text-label text-drift-text-tertiary hover:text-drift-accent transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-drift-accent/[0.06]"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
              Refresh
            </button>
          )}
        </div>

        {/* Loading state */}
        {isLoadingAssessment && (
          <DriftCard>
            <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-5 h-5 rounded-full border border-drift-accent/30 border-t-drift-accent animate-spin" />
              <p className="text-body-sm text-drift-text-tertiary">Analysing your workflow...</p>
            </div>
          </DriftCard>
        )}

        {/* Error state */}
        {assessmentError && !isLoadingAssessment && (
          <DriftCard>
            <div className="px-6 py-6 flex items-center justify-between gap-4">
              <p className="text-body-sm text-drift-text-secondary">{assessmentError}</p>
              <button
                onClick={() => fetchAssessment(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm bg-drift-accent/10 text-drift-accent border border-drift-accent/20 hover:bg-drift-accent/15 transition-colors shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          </DriftCard>
        )}

        {/* Assessment content */}
        {assessment && !isLoadingAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Summary */}
            <DriftCard>
              <div className="px-6 py-5">
                <p className="text-body text-drift-text-secondary leading-relaxed">{assessment.summary}</p>
              </div>
            </DriftCard>

            {/* Recommendations */}
            {assessment.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Re-run profiler */}
      <div className="pt-2 pb-4">
        <button
          onClick={handleRerunProfiler}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl',
            'border border-white/[0.07] bg-white/[0.03]',
            'text-body text-drift-text-secondary',
            'hover:border-white/[0.12] hover:text-drift-text-primary hover:bg-white/[0.05]',
            'transition-all duration-300'
          )}
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
          Re-run profiler
        </button>
      </div>
    </div>
  )
}

// ─── RecommendationCard ────────────────────────────────────────────────────

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const config = EFFORT_CONFIG[rec.effort] ?? EFFORT_CONFIG['Medium Lift']
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <DriftCard>
        <div className="px-6 py-5 space-y-3">
          {/* Header row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-h3 text-drift-text-primary leading-snug">{rec.title}</p>
              <p className="text-body text-drift-accent/80 mt-0.5">{rec.tool}</p>
            </div>
            {/* Effort badge */}
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-body-sm font-medium border shrink-0',
              config.pillClass
            )}>
              <Icon className="w-3 h-3" strokeWidth={2} />
              {config.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-body text-drift-text-secondary leading-relaxed">{rec.description}</p>

          {/* Why now */}
          <div className={cn('rounded-xl px-4 py-3 border bg-white/[0.02]', config.accent)}>
            <p className="text-body text-drift-text-secondary">
              <span className="text-drift-text-primary font-medium">Why now — </span>
              {rec.why_now}
            </p>
          </div>
        </div>
      </DriftCard>
    </motion.div>
  )
}
