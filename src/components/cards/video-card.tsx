import { ExternalLink, Youtube, Clock } from 'lucide-react'
import { DriftCard } from '@/components/ui/drift-card'
import { RelevanceScore } from '@/components/ui/relevance-score'
import { CardActions } from '@/components/digest/card-actions'
import type { DigestCard, VideoMetadata, CardAction } from '@/types/digest'
import { cn } from '@/lib/utils'

interface VideoCardProps {
  card: DigestCard
  action?: CardAction
  isExpanded?: boolean
  deeperContent?: string
  onAction: (action: CardAction) => void
  onGoDeeper: () => void
}

export function VideoCard({
  card, action, isExpanded, deeperContent, onAction, onGoDeeper
}: VideoCardProps) {
  const meta = card.metadata as VideoMetadata

  return (
    <DriftCard glowing={card.relevance_score >= 8}>
      <div className="flex items-start gap-4">
        {/* Video thumbnail placeholder */}
        <div className={cn(
          'w-20 h-14 rounded-lg shrink-0',
          'bg-drift-elevated border border-white/10',
          'flex items-center justify-center'
        )}>
          <Youtube className="w-6 h-6 text-drift-text-tertiary" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Source */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-label text-drift-text-tertiary">{meta.platform}</span>
            <span className="text-label text-drift-text-tertiary">·</span>
            <span className="text-label text-drift-text-tertiary">{meta.channel}</span>
            {meta.duration_minutes && (
              <>
                <span className="text-label text-drift-text-tertiary">·</span>
                <span className="flex items-center gap-1 text-label text-drift-text-tertiary">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  {meta.duration_minutes}m
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h2 className="text-h3 text-drift-text-primary mb-2 leading-snug">{card.title}</h2>

          {/* Topic tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {meta.topic_tags.slice(0, 3).map(tag => (
              <span key={tag} className={cn(
                'text-label px-2 py-0.5 rounded-full',
                'bg-white/5 border border-white/10 text-drift-text-secondary'
              )}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <RelevanceScore score={card.relevance_score} />
      </div>

      {/* Summary */}
      <p className="text-body-sm text-drift-text-secondary mt-3 mb-3">{card.summary}</p>

      {/* Key timestamps */}
      {meta.key_timestamps && meta.key_timestamps.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {meta.key_timestamps.map((ts, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-mono text-drift-accent text-xs w-10">{ts.time}</span>
              <span className="text-body-sm text-drift-text-secondary">{ts.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Relevance */}
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-drift-accent/10 border border-drift-accent/20 text-label text-drift-accent'
      )}>
        {card.relevance_reason}
      </span>

      {/* Source link */}
      {card.source_url && (
        <a
          href={card.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-2 text-body-sm text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
          Watch video
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
