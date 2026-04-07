import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v },
  removeItem: (k: string) => { delete mockStorage[k] },
})
vi.stubGlobal('crypto', { randomUUID: () => 'col-uuid-1234' })

import {
  loadCollections, saveCollections, getCollections,
  addCollection, updateCollection, removeCollection, createCollection,
} from '../saved-collections'
import type { Collection } from '@/types/collection'

const mockCol: Collection = {
  id: 'col-1',
  name: 'Research',
  emoji: '📚',
  createdAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
}

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('loadCollections', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadCollections()).toEqual([])
  })
  it('returns parsed collections from storage', () => {
    mockStorage['drift-saved-collections'] = JSON.stringify([mockCol])
    expect(loadCollections()).toEqual([mockCol])
  })
  it('returns empty array on invalid JSON', () => {
    mockStorage['drift-saved-collections'] = 'bad'
    expect(loadCollections()).toEqual([])
  })
})

describe('addCollection', () => {
  it('appends collection to existing list', () => {
    saveCollections([mockCol])
    const col2 = { ...mockCol, id: 'col-2', name: 'Auth' }
    addCollection(col2)
    expect(loadCollections()).toHaveLength(2)
    expect(loadCollections()[1].id).toBe('col-2')
  })
})

describe('updateCollection', () => {
  it('updates name and emoji of matching collection', () => {
    saveCollections([mockCol])
    updateCollection('col-1', { name: 'Deep Research', emoji: '🔬' })
    const updated = loadCollections()[0]
    expect(updated.name).toBe('Deep Research')
    expect(updated.emoji).toBe('🔬')
  })
  it('does not affect other collections', () => {
    const col2 = { ...mockCol, id: 'col-2', name: 'Auth' }
    saveCollections([mockCol, col2])
    updateCollection('col-1', { name: 'New Name' })
    expect(loadCollections()[1].name).toBe('Auth')
  })
})

describe('removeCollection', () => {
  it('removes collection by id', () => {
    saveCollections([mockCol])
    removeCollection('col-1')
    expect(loadCollections()).toEqual([])
  })
})

describe('getCollections', () => {
  it('returns all collections', () => {
    saveCollections([mockCol])
    expect(getCollections()).toEqual([mockCol])
  })
})

describe('createCollection', () => {
  it('sets id and createdAt automatically', () => {
    const col = createCollection({ name: 'Test', emoji: '🧪', source: 'manual' })
    expect(col.id).toBe('col-uuid-1234')
    expect(col.createdAt).toBeTruthy()
    expect(col.name).toBe('Test')
    expect(col.emoji).toBe('🧪')
    expect(col.source).toBe('manual')
  })
})
