import { ExternalLink, Clock, FileText } from 'lucide-react'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { CardActions } from '@/components/digest/card-actions'
import type { DigestCard, ArticleMetadata, CardAction } from '@/types/digest'
import { cn } from '@/lib/utils'

interface ArticleCardProps {
  card: DigestCard
  action?: CardAction
  isExpanded?: boolean
  deeperContent?: string
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function ArticleCard({
  card, action, isExpanded, deeperContent, onAction, onGoDeeper
}: ArticleCardProps) {
  const meta = card.metadata as ArticleMetadata

  return (
    <DriftCard glowing={card.relevance_score >= 8}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Source tag */}
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-drift-text-tertiary" strokeWidth={1.5} />
            <span className="text-label text-drift-text-tertiary">{meta.source}</span>
            {meta.author && (
              <span className="text-label text-drift-text-tertiary">· {meta.author}</span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-h2 text-drift-text-primary mb-2">{card.title}</h2>

          {/* Summary */}
          <p className="text-body-sm text-drift-text-secondary mb-2">{card.summary}</p>

          {/* Key takeaway */}
          <p className="text-body-sm text-drift-accent/80 italic mb-3">
            "{meta.key_takeaway}"
          </p>

          {/* Relevance + read time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'bg-drift-accent/10 border border-drift-accent/20 text-label text-drift-accent'
            )}>
              {card.relevance_reason}
            </span>
            <span className="flex items-center gap-1 text-label text-drift-text-tertiary">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              {meta.read_time_minutes} min read
            </span>
          </div>
        </div>

        <RelevanceScore score={card.relevance_score} />
      </div>

      {/* Source link */}
      {card.source_url && (
        <a
          href={card.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-3 text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
          Read article
        </a>
      )}

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
