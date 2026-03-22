'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { pageFade } from '@/lib/motion'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} {...pageFade}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
