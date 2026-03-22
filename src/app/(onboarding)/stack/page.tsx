'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
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
          {ROLES.map(role => (
            <motion.button
              key={role}
              variants={cardReveal}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'px-4 py-3 rounded-xl text-left text-body-sm font-medium transition-all duration-200',
                'border',
                selectedRole === role
                  ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent'
                  : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/20 hover:text-drift-text-primary'
              )}
            >
              {role}
            </motion.button>
          ))}
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
          {filteredStack.map(tech => (
            <button
              key={tech}
              onClick={() => toggleStack(tech)}
              className={cn(
                'px-3 py-1.5 rounded-full text-label transition-all duration-200',
                'border',
                selectedStack.includes(tech)
                  ? 'bg-drift-accent/10 border-drift-accent/40 text-drift-accent'
                  : 'bg-white/5 border-white/10 text-drift-text-secondary hover:border-white/20'
              )}
            >
              {tech}
            </button>
          ))}
        </div>
        {selectedStack.length > 0 && (
          <p className="text-body-sm text-drift-text-tertiary">
            {selectedStack.length} selected
          </p>
        )}
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
