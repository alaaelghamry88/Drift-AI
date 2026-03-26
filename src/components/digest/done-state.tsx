'use client'

import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { pageFade, fadeUp } from '@/lib/motion'

interface DoneStateProps {
  onRefresh: () => void
}

function HorizonIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="240"
      height="60"
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 40 Q60 20 120 40 Q180 60 240 40" stroke="rgba(77,217,192,0.3)" strokeWidth="1.5" fill="none" />
      <path d="M0 50 Q60 30 120 50 Q180 70 240 50" stroke="rgba(77,217,192,0.15)" strokeWidth="1" fill="none" />
      <path d="M0 56 Q60 40 120 56 Q180 72 240 56" stroke="rgba(77,217,192,0.08)" strokeWidth="1" fill="none" />
      <circle cx="120" cy="8" r="3" fill="rgba(77,217,192,0.4)" />
      <circle cx="120" cy="8" r="8" stroke="rgba(77,217,192,0.15)" strokeWidth="1" fill="none" />
    </svg>
  )
}

function AnimatedWave() {
  return (
    <div
      className="fixed pointer-events-none z-[1] overflow-hidden"
      style={{ bottom: 0, left: 0, right: 0, height: '90px' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,37,53,0.7) 100%)' }}
      />
      <div
        style={{
          width: '200vw',
          height: '90px',
          animationName: 'drift-wave-scroll',
          animationDuration: '28s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        <svg
          viewBox="0 0 2880 90"
          width="100%"
          height="90"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,55 C240,22 480,88 720,55 C960,22 1200,88 1440,55 C1680,22 1920,88 2160,55 C2400,22 2640,88 2880,55"
            stroke="rgba(77,217,192,0.18)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M0,65 C240,35 480,95 720,65 C960,35 1200,95 1440,65 C1680,35 1920,95 2160,65 C2400,35 2640,95 2880,65"
            stroke="rgba(77,217,192,0.07)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,55 C240,22 480,88 720,55 C960,22 1200,88 1440,55 C1680,22 1920,88 2160,55 C2400,22 2640,88 2880,55 L2880,90 L0,90 Z"
            fill="rgba(10,37,53,0.4)"
          />
        </svg>
      </div>
    </div>
  )
}

export function DoneState({ onRefresh }: DoneStateProps) {
  return (
    <motion.div
      {...pageFade}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <AnimatedWave />
      <HorizonIllustration className="mb-12 opacity-60" />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-label text-drift-accent mb-4 tracking-widest"
      >
        YOU'RE ALL CAUGHT UP
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-display text-drift-text-primary mb-6 max-w-sm"
      >
        Today's signal, delivered.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-body text-drift-text-secondary max-w-xs mb-10"
      >
        You've reviewed everything worth your attention today. Come back tomorrow for fresh signal.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-drift-text-secondary text-body-sm hover:border-white/20 hover:text-drift-text-primary hover:bg-white/[0.08] transition-all duration-200"
      >
        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
        Refresh digest
      </motion.button>
    </motion.div>
  )
}
