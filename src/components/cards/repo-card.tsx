import { ExternalLink, Github, Star } from 'lucide-react'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { CardActions } from '@/components/digest/card-actions'
import type { DigestCard, RepoMetadata, CardAction } from '@/types/digest'
import { cn } from '@/lib/utils'

interface RepoCardProps {
  card: DigestCard
  action?: CardAction
  isExpanded?: boolean
  deeperContent?: string
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function RepoCard({
  card, action, isExpanded, deeperContent, onAction, onGoDeeper
}: RepoCardProps) {
  const meta = card.metadata as RepoMetadata

  return (
    <DriftCard glowing={card.relevance_score >= 8}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-drift-text-tertiary" strokeWidth={1.5} />
          <span className="text-label text-drift-text-tertiary">GITHUB REPO</span>
          {meta.language && (
            <span className="text-label text-drift-text-tertiary px-2 py-0.5 rounded bg-white/5">
              {meta.language}
            </span>
          )}
        </div>
        <RelevanceScore score={card.relevance_score} />
      </div>

      {/* Title */}
      <h2 className="text-h2 text-drift-text-primary font-mono mb-2">{card.title}</h2>

      {/* Star count */}
      {meta.stars && (
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-3.5 h-3.5 text-drift-gold" strokeWidth={1.5} />
          <span className="text-mono text-drift-gold text-sm">
            {meta.stars.toLocaleString()}
          </span>
        </div>
      )}

      {/* Summary */}
      <p className="text-body-sm text-drift-text-secondary mb-3">{card.summary}</p>

      {/* Use case */}
      <div className={cn(
        'px-3 py-2 rounded-xl mb-3',
        'bg-white/[0.03] border border-white/[0.06]'
      )}>
        <p className="text-label text-drift-text-tertiary mb-1">USE CASE</p>
        <p className="text-body-sm text-drift-text-secondary">{meta.use_case}</p>
      </div>

      {/* Relevance */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-drift-accent/10 border border-drift-accent/20 text-label text-drift-accent'
      )}>
        {card.relevance_reason}
      </span>

      {/* Link */}
      <a
        href={meta.github_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 mt-2 text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
        View on GitHub
      </a>

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
