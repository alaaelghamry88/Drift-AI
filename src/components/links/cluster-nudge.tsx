'use client'

import { X } from 'lucide-react'

interface ClusterNudgeProps {
  suggestion: { name: string; ids: string[] }
  onAccept: (name: string, ids: string[]) => void
  onDismiss: () => void
}

export function ClusterNudge({ suggestion, onAccept, onDismiss }: ClusterNudgeProps) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-drift-accent/[0.06] border border-drift-accent/[0.18] rounded-xl">
      <span className="text-drift-accent text-xs shrink-0">✦</span>
      <p className="flex-1 text-label text-drift-text-secondary">
        {suggestion.ids.length} links look like &ldquo;{suggestion.name}&rdquo; — create collection?
      </p>
      <button
        onClick={() => onAccept(suggestion.name, suggestion.ids)}
        className="text-label text-drift-accent font-medium shrink-0 hover:text-drift-accent/80 transition-colors duration-150"
      >
        Create →
      </button>
      <button
        onClick={onDismiss}
        className="text-drift-text-tertiary shrink-0 hover:text-drift-text-secondary transition-colors duration-150"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
