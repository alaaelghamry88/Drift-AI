'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeUp, cardReveal, staggerChildren } from '@/lib/motion'
import type { DriftProfile } from '@/types/profile'
import { useProfile } from '@/hooks/use-profile'

const AI_USAGE_OPTIONS = [
  'Code completion (Copilot / Cursor)',
  'Chat-based coding (ChatGPT / Claude)',
  'Code review and refactoring',
  'Writing documentation',
  'Debugging and error fixing',
  'Generating boilerplate / scaffolding',
  'Research and learning',
  'Prompt engineering / LLM features',
]

const AI_TOOLS_OPTIONS = [
  'GitHub Copilot', 'Cursor', 'Windsurf', 'Continue',
  'ChatGPT', 'Claude', 'Gemini', 'Perplexity',
  'v0', 'Bolt', 'Lovable', 'Replit',
  'LangChain', 'LlamaIndex', 'CrewAI',
  'None yet',
]

const QUESTIONS = [
  {
    id: 'ai_usage',
    question: 'How are you currently using AI in your coding workflow?',
    type: 'multi-select' as const,
    options: AI_USAGE_OPTIONS,
  },
  {
    id: 'ai_tools',
    question: 'What AI tools are you actively using?',
    type: 'multi-select' as const,
    options: AI_TOOLS_OPTIONS,
  },
  {
    id: 'time_sink',
    question: "What's your biggest time sink in your current project?",
    type: 'text' as const,
    placeholder: 'e.g. debugging complex state, writing tests, code reviews...',
  },
  {
    id: 'agents',
    question: 'How much have you explored AI agents or automated workflows?',
    type: 'scale' as const,
    options: ['Not at all', 'A little', 'Moderately', 'Quite a bit', 'Heavily'],
  },
  {
    id: 'hesitation',
    question: "What's your biggest hesitation with adopting more AI tooling?",
    type: 'single-select' as const,
    options: [
      'Quality / reliability concerns',
      'Security and privacy',
      'Time to learn and integrate',
      'Cost',
      'Not sure what to adopt',
      'Team / org buy-in',
      'I have no hesitations',
    ],
  },
]

type Answers = Record<string, string | string[]>

export default function ProfilerPage() {
  const router = useRouter()
  const { saveProfile } = useProfile()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [isGenerating, setIsGenerating] = useState(false)

  const question = QUESTIONS[currentQ]
  const currentAnswer = answers[question.id]
  const isLast = currentQ === QUESTIONS.length - 1

  const canAdvance = () => {
    const ans = answers[question.id]
    if (!ans) return false
    if (Array.isArray(ans)) return ans.length > 0
    return ans.trim().length > 0
  }

  const toggleMulti = (option: string) => {
    setAnswers(prev => {
      const current = (prev[question.id] as string[] | undefined) || []
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [question.id]: updated }
    })
  }

  const setSingle = (option: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: option }))
  }

  const handleNext = async () => {
    if (!canAdvance()) return

    if (!isLast) {
      setCurrentQ(prev => prev + 1)
      return
    }

    // Final step — generate profile
    setIsGenerating(true)
    try {
      const role = sessionStorage.getItem('onboarding_role') || 'Developer'
      const stack = JSON.parse(sessionStorage.getItem('onboarding_stack') || '[]') as string[]
      const context = sessionStorage.getItem('onboarding_context') || ''

      const profile: DriftProfile = {
        role,
        stack,
        currentContext: context,
        workflowAnswers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      saveProfile(profile)

      // Brief pause for the "generation" feel
      await new Promise(resolve => setTimeout(resolve, 2200))
      router.push('/')
    } catch {
      setIsGenerating(false)
    }
  }

  if (isGenerating) {
    return <GeneratingProfile />
  }

  return (
    <motion.div {...fadeUp} className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-label text-drift-accent">Step 3 of 3</p>
        <h1 className="text-h1 text-drift-text-primary">AI Workflow Profiler</h1>
        <p className="text-body text-drift-text-secondary">
          5 questions to understand how you work with AI today.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-1">
            {QUESTIONS.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-drift-accent-muted to-drift-accent"
                  initial={{ width: '0%' }}
                  animate={{
                    width: i < currentQ ? '100%' : '0%',
                  }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            ))}
          </div>
          <span className="ml-3 text-label text-drift-text-tertiary tabular-nums shrink-0">
            {currentQ + 1} / {QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <p className="text-h2 text-drift-text-primary">{question.question}</p>

          {question.type === 'multi-select' && (
            <motion.div
              variants={staggerChildren}
              initial="initial"
              animate="animate"
              className="flex flex-wrap gap-2"
            >
              {question.options?.map(option => {
                const selected = (currentAnswer as string[] | undefined)?.includes(option)
                return (
                  <motion.button
                    key={option}
                    variants={cardReveal}
                    onClick={() => toggleMulti(option)}
                    whileHover={!selected ? { scale: 1.04 } : { scale: 0.97 }}
                    whileTap={{ scale: 0.93 }}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-2 rounded-xl text-body-sm transition-all duration-200 border',
                      selected
                        ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent shadow-[0_0_8px_rgba(77,217,192,0.1)]'
                        : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/[0.18]'
                    )}
                  >
                    <AnimatePresence initial={false}>
                      {selected && (
                        <motion.span
                          key="check"
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 12, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden flex items-center"
                        >
                          <Check className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {option}
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {question.type === 'single-select' && (
            <div className="space-y-2">
              {question.options?.map(option => {
                const isSelected = currentAnswer === option
                return (
                  <motion.button
                    key={option}
                    onClick={() => setSingle(option)}
                    whileHover={!isSelected ? { x: 4 } : {}}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-body transition-all duration-200 border',
                      'flex items-center justify-between',
                      isSelected
                        ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent shadow-[0_0_12px_rgba(77,217,192,0.08)]'
                        : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/[0.18] hover:text-drift-text-primary'
                    )}
                  >
                    <span>{option}</span>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          className="w-5 h-5 rounded-full bg-drift-accent/20 border border-drift-accent/40 flex items-center justify-center shrink-0"
                        >
                          <Check className="w-3 h-3 text-drift-accent" strokeWidth={2.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
          )}

          {question.type === 'scale' && (
            <div className="space-y-2">
              {question.options?.map((option, i) => {
                const isSelected = currentAnswer === option
                return (
                  <motion.button
                    key={option}
                    onClick={() => setSingle(option)}
                    whileHover={!isSelected ? { x: 4 } : {}}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl flex items-center gap-3',
                      'text-body transition-all duration-200 border',
                      isSelected
                        ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent shadow-[0_0_12px_rgba(77,217,192,0.08)]'
                        : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/[0.18] hover:text-drift-text-primary'
                    )}
                  >
                    <span className={cn('text-label w-4 tabular-nums', isSelected ? 'text-drift-accent' : 'text-drift-text-tertiary')}>{i + 1}</span>
                    <span className="flex-1">{option}</span>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          className="w-5 h-5 rounded-full bg-drift-accent/20 border border-drift-accent/40 flex items-center justify-center shrink-0"
                        >
                          <Check className="w-3 h-3 text-drift-accent" strokeWidth={2.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              value={(currentAnswer as string | undefined) || ''}
              onChange={e => setSingle(e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              className={cn(
                'w-full px-4 py-4 rounded-xl resize-none',
                'bg-drift-surface border border-white/10',
                'text-body text-drift-text-primary placeholder:text-drift-text-tertiary',
                'outline-none focus:border-drift-accent/40 transition-colors'
              )}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentQ > 0 && (
          <button
            onClick={() => setCurrentQ(prev => prev - 1)}
            className={cn(
              'px-4 py-4 rounded-xl',
              'border border-white/10 bg-transparent',
              'text-drift-text-secondary',
              'hover:border-white/20 hover:text-drift-text-primary hover:bg-white/5',
              'transition-all duration-300'
            )}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          className={cn(
            'flex-1 px-6 py-4 rounded-xl flex items-center justify-center gap-2',
            'font-body font-semibold text-body transition-all duration-300',
            canAdvance()
              ? 'bg-drift-accent text-drift-base shadow-[0_0_20px_rgba(77,217,192,0.25)] hover:shadow-[0_0_28px_rgba(77,217,192,0.40)] hover:bg-drift-accent-soft active:scale-[0.98]'
              : 'bg-white/5 text-drift-text-tertiary cursor-not-allowed'
          )}
        >
          {isLast ? 'Generate my profile' : 'Next'}
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  )
}

function GeneratingProfile() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 space-y-10 text-center"
    >
      {/* Concentric ring pulse — like sonar / water ripple */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-drift-accent/30"
            initial={{ width: 32, height: 32, opacity: 0.8 }}
            animate={{ width: 80, height: 80, opacity: 0 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeOut',
            }}
          />
        ))}
        {/* Center wave glyph */}
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-drift-accent text-2xl relative z-10"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          ∿
        </motion.span>
      </div>

      <div className="space-y-3">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-label text-drift-accent tracking-[0.14em]"
        >
          CALIBRATING YOUR SIGNAL
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-body-sm text-drift-text-secondary max-w-[260px] leading-relaxed"
        >
          Building your profile from your stack, context, and workflow...
        </motion.p>
      </div>

      {/* Wave dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex gap-1.5"
      >
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            className="w-1 h-3 rounded-full bg-drift-accent origin-bottom"
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
