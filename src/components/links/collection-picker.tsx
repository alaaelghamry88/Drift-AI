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
              ? 'bg-drift-accent/15 border-drift-accent/40 text-drift-accent'
              : 'bg-white/[0.04] border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
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
            className="w-6 bg-transparent text-center outline-none text-body"
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
            className="bg-transparent text-label text-drift-text-primary outline-none placeholder:text-drift-text-tertiary w-24"
          />
          <button onClick={handleCreate} className="text-label text-drift-accent font-medium">
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-xl text-label border border-dashed border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary transition-all duration-200"
        >
          + New
        </button>
      )}
    </div>
  )
}
