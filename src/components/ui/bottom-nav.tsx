'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, Link2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home,      label: 'Today',   href: '/' },
  { icon: Sparkles,  label: 'Ask',     href: '/ask' },
  { icon: Link2,     label: 'Drop',    href: '/drop' },
  { icon: User,      label: 'Profile', href: '/profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Frosted glass bar */}
      <div className="absolute inset-0 bg-drift-base/75 backdrop-blur-2xl border-t border-white/[0.05]" />
      {/* Top fade shadow */}
      <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-drift-base/40 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-lg flex items-center justify-around px-6 pt-2 pb-3">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-5 py-2 rounded-2xl',
                'transition-all duration-300',
                isActive
                  ? [
                      'text-drift-accent',
                      'bg-drift-elevated',
                      'border border-drift-accent/[0.18]',
                      'shadow-[0_0_18px_rgba(77,217,192,0.07),inset_0_1px_0_rgba(255,255,255,0.04)]',
                    ]
                  : 'text-drift-text-tertiary hover:text-drift-text-secondary hover:bg-white/[0.03]'
              )}
            >
              <Icon
                className={cn('w-5 h-5 transition-all duration-300', isActive && 'drop-shadow-[0_0_6px_rgba(77,217,192,0.5)]')}
                strokeWidth={isActive ? 1.75 : 1.5}
              />
              <span className={cn('text-label transition-all duration-300', isActive && 'text-drift-accent')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
