'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/types/collection'

interface CollectionPickerProps {
  selected: string[]
  collections: Collection[]
  onToggle: (id: string) => void
  onNew: (collection: Collection) => void
}

export function CollectionPicker({
  selected,
  collections,
  onToggle,
  onNew,
}: CollectionPickerProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const col: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      emoji,
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
    onNew(col)
    setName('')
    setEmoji('📁')
    setCreating(false)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => onToggle(col.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label border transition-all duration-200',
            selected.includes(col.id)
              ? 'bg-drift-accent/15 border-drift-accent/40 text-drift-card-warm-accent'
              : 'bg-drift-card-warm-border/30 border-drift-card-warm-border text-drift-card-warm-body hover:text-drift-card-warm-title'
          )}
        >
          <span>{col.emoji}</span>
          <span>{col.name}</span>
        </button>
      ))}

      {creating ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-drift-accent/30 bg-drift-accent/[0.06]">
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-6 bg-transparent text-center outline-none text-drift-card-warm-title"
            maxLength={2}
          />
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Name"
            className="bg-transparent text-label text-drift-card-warm-title outline-none placeholder:text-drift-card-warm-body/50 w-24"
          />
          <button onClick={handleCreate} className="text-label text-drift-card-warm-accent font-medium">
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-xl text-label border border-dashed border-drift-card-warm-border text-drift-card-warm-body/60 hover:text-drift-card-warm-body transition-all duration-200"
        >
          + New
        </button>
      )}
    </div>
  )
}
