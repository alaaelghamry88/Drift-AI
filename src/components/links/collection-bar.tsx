'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Collection } from '@/types/collection'

interface CollectionBarProps {
  collections: Collection[]
  active: string | null   // collection id; null = All
  onSelect: (id: string | null) => void
  onNew: (col: Collection) => void
}

export function CollectionBar({ collections, active, onSelect, onNew }: CollectionBarProps) {
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
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200 font-medium',
          active === null
            ? 'bg-drift-accent text-[#0a0f1a]'
            : 'bg-white/[0.05] border border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary'
        )}
      >
        All
      </button>

      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => onSelect(col.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200',
            active === col.id
              ? 'bg-drift-accent/15 border border-drift-accent/30 text-drift-accent'
              : 'bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
          )}
        >
          <span>{col.emoji}</span>
          <span>{col.name}</span>
        </button>
      ))}

      {creating ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-drift-accent/30 bg-drift-accent/[0.06] shrink-0">
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-5 bg-transparent text-center outline-none text-label"
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
            className="bg-transparent text-label text-drift-text-primary outline-none placeholder:text-drift-text-tertiary w-20"
          />
          <button onClick={handleCreate} className="text-label text-drift-accent font-medium">
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-full text-label shrink-0 border border-dashed border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary transition-all duration-200"
        >
          + New
        </button>
      )}
    </div>
  )
}
