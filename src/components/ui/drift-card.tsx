'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DriftCardProps {
  children: React.ReactNode
  className?: string
  glowing?: boolean
  onClick?: () => void
}

export function DriftCard({ children, className, glowing, onClick }: DriftCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -2 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-drift-surface',
        'backdrop-blur-xl p-6',
        'transition-all duration-300',
        'hover:border-white/[0.10] hover:bg-drift-elevated',
        glowing && 'border-drift-accent/40 shadow-[0_0_24px_rgba(77,217,192,0.12)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
