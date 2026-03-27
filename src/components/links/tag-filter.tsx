'use client'

import { cn } from '@/lib/utils'

interface TagFilterProps {
  tags: string[]
  active: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}

export function TagFilter({ tags, active, onToggle, onClear }: TagFilterProps) {
  const allSelected = active.length === 0

  const allChip = { id: '__all__', label: 'All', isAll: true }
  const chips = [allChip, ...tags.map(t => ({ id: t, label: t, isAll: false }))]

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={chip.isAll ? onClear : () => onToggle(chip.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-label shrink-0 transition-all duration-200',
            chip.isAll
              ? cn(
                  'font-medium',
                  allSelected
                    ? 'bg-drift-accent text-[#0a0f1a]'
                    : 'bg-white/[0.05] border border-white/[0.08] text-drift-text-tertiary hover:text-drift-text-secondary'
                )
              : active.includes(chip.id)
                ? 'bg-drift-accent/15 border border-drift-accent/30 text-drift-accent'
                : 'bg-white/[0.04] border border-white/[0.07] text-drift-text-tertiary hover:text-drift-text-secondary'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
