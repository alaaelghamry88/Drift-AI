'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeUp, staggerChildren, cardReveal } from '@/lib/motion'
import { TECH_STACK_OPTIONS, type Role } from '@/types/profile'

const ROLES: Role[] = [
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Mobile Developer',
  'ML / AI Engineer',
  'DevOps / Platform Engineer',
  'Engineering Lead',
  'Technical Founder',
  'Other',
]

export default function StackPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedStack, setSelectedStack] = useState<string[]>([])
  const [stackSearch, setStackSearch] = useState('')

  const filteredStack = TECH_STACK_OPTIONS.filter(tech =>
    tech.toLowerCase().includes(stackSearch.toLowerCase())
  )

  const toggleStack = (tech: string) => {
    setSelectedStack(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  const canContinue = selectedRole && selectedStack.length >= 1

  const handleContinue = () => {
    if (!canContinue) return
    sessionStorage.setItem('onboarding_role', selectedRole)
    sessionStorage.setItem('onboarding_stack', JSON.stringify(selectedStack))
    router.push('/context')
  }

  return (
    <motion.div {...fadeUp} className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-label text-drift-accent">Step 1 of 3</p>
        <h1 className="text-h1 text-drift-text-primary">What's your role and stack?</h1>
        <p className="text-body text-drift-text-secondary">
          Drift curates your digest around what you actually build with.
        </p>
      </div>

      {/* Role selection */}
      <div className="space-y-3">
        <p className="text-label text-drift-text-tertiary">Your role</p>
        <motion.div
          variants={staggerChildren}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-2"
        >
          {ROLES.map(role => {
            const isSelected = selectedRole === role
            return (
              <motion.button
                key={role}
                variants={cardReveal}
                onClick={() => setSelectedRole(role)}
                whileHover={!isSelected ? { y: -2, scale: 1.01 } : {}}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'relative px-4 py-3.5 rounded-xl text-left text-body-sm font-medium transition-all duration-200',
                  'border overflow-hidden',
                  isSelected
                    ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent shadow-[0_0_16px_rgba(77,217,192,0.10)]'
                    : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/[0.18] hover:text-drift-text-primary'
                )}
              >
                {/* Selection shimmer */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      key="shimmer"
                      initial={{ opacity: 0, x: '-100%' }}
                      animate={{ opacity: 1, x: '200%' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-drift-accent/10 to-transparent pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <span className="relative z-10">{role}</span>

                {/* Check mark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-drift-accent/20 border border-drift-accent/40 flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-drift-accent" strokeWidth={2.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Stack selection */}
      <div className="space-y-3">
        <p className="text-label text-drift-text-tertiary">Your stack</p>
        <input
          type="text"
          value={stackSearch}
          onChange={e => setStackSearch(e.target.value)}
          placeholder="Search technologies..."
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-drift-surface border border-white/10',
            'text-body text-drift-text-primary placeholder:text-drift-text-tertiary',
            'outline-none focus:border-drift-accent/40 transition-colors'
          )}
        />
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
          {filteredStack.map(tech => {
            const isSelected = selectedStack.includes(tech)
            return (
              <motion.button
                key={tech}
                onClick={() => toggleStack(tech)}
                whileHover={!isSelected ? { scale: 1.05 } : { scale: 0.97 }}
                whileTap={{ scale: 0.93 }}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label transition-all duration-200',
                  'border',
                  isSelected
                    ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent shadow-[0_0_8px_rgba(77,217,192,0.12)]'
                    : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/[0.18]'
                )}
              >
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.span
                      key="chip-check"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 12, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="overflow-hidden flex items-center"
                    >
                      <Check className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
                {tech}
              </motion.button>
            )
          })}
        </div>
        <AnimatePresence>
          {selectedStack.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-body-sm text-drift-text-tertiary"
            >
              <span className="text-drift-accent font-medium">{selectedStack.length}</span> selected
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue */}
      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={cn(
          'w-full px-6 py-4 rounded-xl flex items-center justify-center gap-2',
          'font-body font-semibold text-body transition-all duration-300',
          canContinue
            ? 'bg-drift-accent text-drift-base shadow-[0_0_20px_rgba(77,217,192,0.25)] hover:shadow-[0_0_28px_rgba(77,217,192,0.40)] hover:bg-drift-accent-soft active:scale-[0.98]'
            : 'bg-white/5 text-drift-text-tertiary cursor-not-allowed'
        )}
      >
        Continue
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </motion.div>
  )
}
