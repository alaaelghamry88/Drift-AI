'use client'

import { useState } from 'react'
import { Zap, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextBarProps {
  value: string
  onChange: (value: string) => void
}

export function ContextBar({ value, onChange }: ContextBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) onChange(trimmed)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  return (
    <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3.5 py-2.5">
      <Zap className="w-3.5 h-3.5 text-drift-accent shrink-0" strokeWidth={1.5} />
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            className="flex-1 bg-transparent text-body-sm text-drift-text-primary outline-none placeholder:text-drift-text-tertiary"
            placeholder="What are you building right now?"
          />
          <button onClick={commit} className="text-drift-accent shrink-0">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </>
      ) : (
        <>
          <span className={cn(
            'flex-1 text-body-sm truncate',
            value ? 'text-drift-text-secondary' : 'text-drift-text-tertiary'
          )}>
            {value || 'What are you building right now?'}
          </span>
          <button
            onClick={() => { setDraft(value); setEditing(true) }}
            className="text-drift-text-tertiary hover:text-drift-accent transition-colors duration-200 shrink-0"
          >
            <Pencil className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  )
}
