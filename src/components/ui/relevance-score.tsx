import { cn } from '@/lib/utils'

interface RelevanceScoreProps {
  score: number
}

export function RelevanceScore({ score }: RelevanceScoreProps) {
  const isHigh   = score >= 8
  const isMid    = score >= 5

  const ringColor = isHigh
    ? 'border-drift-gold/40'
    : isMid
    ? 'border-drift-accent/30'
    : 'border-white/10'

  const textColor = isHigh
    ? 'text-drift-gold'
    : isMid
    ? 'text-drift-accent'
    : 'text-drift-muted'

  const glow = isHigh
    ? 'shadow-[0_0_14px_rgba(232,201,122,0.25),inset_0_0_8px_rgba(232,201,122,0.06)]'
    : isMid
    ? 'shadow-[0_0_10px_rgba(77,217,192,0.18),inset_0_0_6px_rgba(77,217,192,0.04)]'
    : ''

  return (
    <div className={cn(
      'font-mono text-mono-lg font-medium tabular-nums',
      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
      'border bg-white/[0.04]',
      ringColor,
      textColor,
      glow,
    )}>
      {score}
    </div>
  )
}
