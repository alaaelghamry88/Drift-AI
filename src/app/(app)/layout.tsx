'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'
import { useProfile } from '@/hooks/use-profile'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoaded } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !profile) {
      router.replace('/stack')
    }
  }, [isLoaded, profile, router])

  if (!isLoaded || !profile) {
    return (
      <div className="min-h-screen bg-drift-base flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-drift-accent/20 border-t-drift-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="drift-bg min-h-screen">
      <header className="relative z-10 mx-auto max-w-[680px] px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-baseline justify-center gap-2 select-none">
          <span
            className="text-drift-accent"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              lineHeight: 1,
              animationName: 'drift-glow-breathe',
              animationDuration: '3.5s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          >
            ∿
          </span>
          <span
            className="text-drift-text-primary"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.04em' }}
          >
            drift
          </span>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-[680px] px-4 md:px-6 pb-28">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
