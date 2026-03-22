import { cn } from '@/lib/utils'

interface RelevanceScoreProps {
  score: number
}

export function RelevanceScore({ score }: RelevanceScoreProps) {
  const isTopPick     = score >= 9
  const isStrongMatch = score >= 7
  const isRelevant    = score >= 5

  const label = isTopPick
    ? 'Top pick'
    : isStrongMatch
    ? 'Strong signal'
    : isRelevant
    ? 'Relevant'
    : 'FYI'

  const styles = isTopPick
    ? 'text-amber-400 border-amber-400/30 bg-amber-400/[0.08]'
    : isStrongMatch
    ? 'text-drift-accent border-drift-accent/25 bg-drift-accent/[0.08]'
    : isRelevant
    ? 'text-sky-400/80 border-sky-400/20 bg-sky-400/[0.06]'
    : 'text-drift-muted border-white/[0.08] bg-white/[0.03]'

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-lg text-label border shrink-0',
      styles
    )}>
      {label}
    </span>
  )
}
