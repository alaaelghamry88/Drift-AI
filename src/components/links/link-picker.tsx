'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { SavedLink } from '@/types/saved-link'

interface LinkPickerProps {
  links: SavedLink[]
  onSelect: (link: SavedLink) => void
  onClose: () => void
}

export function LinkPicker({ links, onSelect, onClose }: LinkPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = links.filter(l => {
    const q = search.toLowerCase()
    return !q || l.title.toLowerCase().includes(q) || (l.siteName ?? '').toLowerCase().includes(q)
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl bg-[#0d1424] border border-white/[0.08] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <span className="text-label font-medium text-drift-text-secondary">Attach a link</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-drift-text-tertiary hover:text-drift-text-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2.5">
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-drift-text-tertiary shrink-0" strokeWidth={1.5} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-body-sm text-drift-text-primary placeholder:text-drift-text-tertiary outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[220px] px-4 pb-3 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-label text-drift-text-tertiary text-center py-5">
            {links.length === 0 ? 'No saved links yet.' : 'No links found.'}
          </p>
        ) : (
          filtered.map(link => (
            <button
              key={link.id}
              onClick={() => { onSelect(link); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-150 text-left"
            >
              {link.thumbnail ? (
                <img
                  src={link.thumbnail}
                  alt=""
                  className="w-8 h-6 rounded-md object-cover shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-8 h-6 rounded-md bg-white/[0.05] shrink-0 flex items-center justify-center text-xs">
                  {link.type === 'video' ? '▶' : link.type === 'repo' ? '⌥' : '📄'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-drift-text-primary truncate leading-snug">{link.title}</p>
                <p className="text-label text-drift-text-tertiary">{link.siteName}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  )
}
