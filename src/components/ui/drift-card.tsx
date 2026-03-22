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
        'rounded-2xl border',
        // Warm charcoal at 60% — lets the teal bg bleed through for genuine glass tint
        'bg-[#1d1b16]/60 backdrop-blur-2xl',
        // Visible border + top-edge shine for the glass "thickness" illusion
        'border-white/[0.12]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.15),0_8px_40px_rgba(0,0,0,0.44)]',
        'transition-all duration-300',
        'hover:bg-[#1d1b16]/70 hover:border-white/[0.18]',
        'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.20),0_16px_52px_rgba(0,0,0,0.52)]',
        glowing && [
          '!border-drift-accent/35',
          '!shadow-[inset_0_1px_0_rgba(77,217,192,0.12),0_0_32px_rgba(77,217,192,0.14),0_8px_40px_rgba(0,0,0,0.44)]',
        ],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
