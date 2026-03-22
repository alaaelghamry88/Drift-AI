'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DriftProfile } from '@/types/profile'

interface LinkDropInputProps {
  profile: DriftProfile
}

export function LinkDropInput({ profile: _ }: LinkDropInputProps) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const handleAssess = () => {
    if (!value.trim()) return
    router.push(`/drop?url=${encodeURIComponent(value.trim())}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAssess()
  }

  return (
    <motion.div
      animate={{
        boxShadow: focused
          ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.10)'
          : '0 0 0 1px rgba(255,255,255,0.06)'
      }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-drift-surface backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Link2 className="w-4 h-4 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Drop a link to assess its relevance..."
          className={cn(
            'flex-1 bg-transparent text-body text-drift-text-primary',
            'placeholder:text-drift-text-tertiary outline-none'
          )}
        />
        <AnimatePresence>
          {value.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleAssess}
              className={cn(
                'flex items-center gap-1.5 text-label text-drift-accent',
                'px-3 py-1.5 rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20',
                'transition-colors duration-200 shrink-0'
              )}
            >
              Assess
              <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
