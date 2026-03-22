import { cn } from '@/lib/utils'

interface RelevanceScoreProps {
  score: number
}

export function RelevanceScore({ score }: RelevanceScoreProps) {
  const color = score >= 8
    ? 'text-drift-gold shadow-[0_0_12px_rgba(232,201,122,0.3)]'
    : score >= 5
    ? 'text-drift-accent shadow-[0_0_12px_rgba(77,217,192,0.2)]'
    : 'text-drift-muted'

  return (
    <div className={cn(
      'text-mono-lg font-medium tabular-nums font-mono',
      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
      'border border-white/10 bg-white/5',
      color
    )}>
      {score}
    </div>
  )
}
