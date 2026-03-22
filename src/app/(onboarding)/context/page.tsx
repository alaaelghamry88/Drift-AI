'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeUp } from '@/lib/motion'

const CONTEXT_EXAMPLES = [
  'Building a SaaS app with Next.js and integrating Claude for AI features',
  'Working on a Python FastAPI backend with RAG pipeline for document Q&A',
  'Prototyping a mobile app with React Native and exploring AI image generation',
  'Leading a team rebuilding our internal tooling with AI-assisted workflows',
]

export default function ContextPage() {
  const router = useRouter()
  const [context, setContext] = useState('')

  const canContinue = context.trim().length >= 20

  const handleContinue = () => {
    if (!canContinue) return
    sessionStorage.setItem('onboarding_context', context.trim())
    router.push('/profiler')
  }

  return (
    <motion.div {...fadeUp} className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-label text-drift-accent">Step 2 of 3</p>
        <h1 className="text-h1 text-drift-text-primary">What are you building?</h1>
        <p className="text-body text-drift-text-secondary">
          This is Drift's most important signal. Everything gets filtered through your current work.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="Describe what you're actively working on right now..."
          rows={5}
          className={cn(
            'w-full px-4 py-4 rounded-xl resize-none',
            'bg-drift-surface border border-white/10',
            'text-body text-drift-text-primary placeholder:text-drift-text-tertiary',
            'outline-none focus:border-drift-accent/40 transition-colors',
            'leading-relaxed'
          )}
        />
        <p className="text-body-sm text-drift-text-tertiary">
          {context.length < 20
            ? `${20 - context.length} more characters to continue`
            : `${context.length} characters`
          }
        </p>
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <p className="text-label text-drift-text-tertiary">Examples</p>
        <div className="space-y-2">
          {CONTEXT_EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => setContext(example)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl',
                'bg-white/[0.03] border border-white/[0.06]',
                'text-body-sm text-drift-text-secondary',
                'hover:border-white/10 hover:bg-white/[0.05] hover:text-drift-text-primary',
                'transition-all duration-200'
              )}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/stack')}
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
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            'flex-1 px-6 py-4 rounded-xl flex items-center justify-center gap-2',
            'font-body font-semibold text-body transition-all duration-300',
            canContinue
              ? 'bg-drift-accent text-drift-base shadow-[0_0_20px_rgba(77,217,192,0.25)] hover:shadow-[0_0_28px_rgba(77,217,192,0.40)] hover:bg-drift-accent-soft active:scale-[0.98]'
              : 'bg-white/5 text-drift-text-tertiary cursor-not-allowed'
          )}
        >
          Continue
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  )
}
