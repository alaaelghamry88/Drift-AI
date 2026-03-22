import { BookOpen, ArrowRight } from 'lucide-react'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { CardActions } from '@/components/digest/card-actions'
import type { DigestCard, SkillMetadata, CardAction } from '@/types/digest'
import { cn } from '@/lib/utils'

interface SkillCardProps {
  card: DigestCard
  action?: CardAction
  isExpanded?: boolean
  deeperContent?: string
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function SkillCard({
  card, action, isExpanded, deeperContent, onAction, onGoDeeper
}: SkillCardProps) {
  const meta = card.metadata as SkillMetadata

  return (
    <DriftCard glowing={card.relevance_score >= 8}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-drift-text-tertiary" strokeWidth={1.5} />
          <span className="text-label text-drift-text-tertiary">SKILL / CONCEPT</span>
        </div>
        <RelevanceScore score={card.relevance_score} />
      </div>

      {/* Title */}
      <h2 className="text-h2 text-drift-text-primary mb-3">{card.title}</h2>

      {/* Summary */}
      <p className="text-body-sm text-drift-text-secondary mb-3">{card.summary}</p>

      {/* Why now */}
      <div className={cn(
        'flex items-start gap-2 px-3 py-2.5 rounded-xl mb-3',
        'bg-drift-gold/[0.08] border border-drift-gold/20'
      )}>
        <span className="text-drift-gold mt-0.5">⚡</span>
        <div>
          <p className="text-label text-drift-gold mb-0.5">WHY NOW</p>
          <p className="text-body-sm text-drift-text-secondary">{meta.why_now}</p>
        </div>
      </div>

      {/* Learning path */}
      {meta.learning_path && (
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-3.5 h-3.5 text-drift-accent" strokeWidth={1.5} />
          <p className="text-body-sm text-drift-text-secondary">{meta.learning_path}</p>
        </div>
      )}

      {/* Relevance */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-drift-accent/10 border border-drift-accent/20 text-label text-drift-accent'
      )}>
        {card.relevance_reason}
      </span>

      {/* Deeper */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-body-sm text-drift-text-secondary leading-relaxed whitespace-pre-wrap">
            {deeperContent || (
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-drift-accent/60 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-drift-accent/60 animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-drift-accent/60 animate-pulse [animation-delay:0.4s]" />
              </span>
            )}
          </p>
        </div>
      )}

      <CardActions
        cardId={card.id}
        action={action}
        isExpanded={isExpanded}
        onAction={onAction}
        onGoDeeper={onGoDeeper}
      />
    </DriftCard>
  )
}
