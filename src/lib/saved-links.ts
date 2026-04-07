import type { SavedLink } from '@/types/saved-link'

const STORAGE_KEY = 'drift-saved-links'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export function loadLinks(): SavedLink[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedLink[]) : []
  } catch {
    return []
  }
}

export function saveLinks(links: SavedLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

export function addLink(link: SavedLink): void {
  saveLinks([link, ...loadLinks()])
}

export function updateLinkStatus(id: string, status: SavedLink['status']): void {
  saveLinks(loadLinks().map(l => l.id === id ? { ...l, status } : l))
}

export function updateLink(
  id: string,
  patch: Partial<Pick<SavedLink, 'note' | 'tags' | 'collectionIds'>>
): void {
  saveLinks(loadLinks().map(l => l.id === id ? { ...l, ...patch } : l))
}

export function removeLink(id: string): void {
  saveLinks(loadLinks().filter(l => l.id !== id))
}

export function archiveExpiredLinks(): void {
  const now = new Date().toISOString()
  saveLinks(
    loadLinks().map(l =>
      l.status === 'active' && l.expiresAt < now
        ? { ...l, status: 'archived' as const }
        : l
    )
  )
}

export function getActiveLinks(): SavedLink[] {
  return loadLinks().filter(l => l.status !== 'removed' && l.status !== 'archived')
}

export function createSavedLink(
  partial: Omit<SavedLink, 'id' | 'savedAt' | 'expiresAt' | 'status' | 'collectionIds' | 'note'>
): SavedLink {
  const savedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()
  return {
    ...partial,
    collectionIds: [],
    note: '',
    id: crypto.randomUUID(),
    savedAt,
    expiresAt,
    status: 'active',
  }
}
