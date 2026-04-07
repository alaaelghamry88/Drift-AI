import type { Collection } from '@/types/collection'

const STORAGE_KEY = 'drift-saved-collections'

export function loadCollections(): Collection[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Collection[]) : []
  } catch {
    return []
  }
}

export function saveCollections(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

export function getCollections(): Collection[] {
  return loadCollections()
}

export function addCollection(collection: Collection): void {
  saveCollections([...loadCollections(), collection])
}

export function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, 'name' | 'emoji'>>
): void {
  saveCollections(loadCollections().map(c => c.id === id ? { ...c, ...patch } : c))
}

export function removeCollection(id: string): void {
  saveCollections(loadCollections().filter(c => c.id !== id))
}

export function createCollection(
  partial: Pick<Collection, 'name' | 'emoji' | 'source'>
): Collection {
  return {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}
