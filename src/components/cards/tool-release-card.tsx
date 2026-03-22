import { ExternalLink, Zap } from 'lucide-react'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { CardActions } from '@/components/digest/card-actions'
import type { DigestCard, ToolReleaseMetadata, CardAction } from '@/types/digest'
import { cn } from '@/lib/utils'

interface ToolReleaseCardProps {
  card: DigestCard
  action?: CardAction
  isExpanded?: boolean
  deeperContent?: string
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function ToolReleaseCard({
  card, action, isExpanded, deeperContent, onAction, onGoDeeper
}: ToolReleaseCardProps) {
  const meta = card.metadata as ToolReleaseMetadata

  return (
    <DriftCard glowing={card.relevance_score >= 8}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-drift-text-tertiary" strokeWidth={1.5} />
          <span className="text-label text-drift-text-tertiary">TOOL RELEASE</span>
          {meta.impact === 'high' && (
            <span className="text-label text-drift-gold px-2 py-0.5 rounded-full border border-drift-gold/30 bg-drift-gold/10">
              HIGH IMPACT
            </span>
          )}
        </div>
        <RelevanceScore score={card.relevance_score} />
      </div>

      {/* Title */}
      <h2 className="text-h2 text-drift-text-primary mb-1">{card.title}</h2>

      {/* Version diff */}
      {(meta.version_from || meta.version_to) && (
        <div className="flex items-center gap-2 mb-3">
          {meta.version_from && (
            <span className="text-mono text-drift-text-tertiary bg-white/5 px-2 py-0.5 rounded">
              v{meta.version_from}
            </span>
          )}
          {meta.version_from && meta.version_to && (
            <span className="text-drift-text-tertiary">→</span>
          )}
          {meta.version_to && (
            <span className="text-mono text-drift-accent bg-drift-accent/10 px-2 py-0.5 rounded">
              v{meta.version_to}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <p className="text-body-sm text-drift-text-secondary mb-3">{card.summary}</p>

      {/* Relevance reason */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-drift-accent/10 border border-drift-accent/20 text-label text-drift-accent'
      )}>
        {card.relevance_reason}
      </span>

      {/* Source */}
      {card.source_url && (
        <a
          href={card.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-2 text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
          {meta.source}
        </a>
      )}

      {/* Deeper expansion */}
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
