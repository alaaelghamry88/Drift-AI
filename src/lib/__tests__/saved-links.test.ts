import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v },
  removeItem: (k: string) => { delete mockStorage[k] },
})
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

import {
  loadLinks, saveLinks, addLink, updateLinkStatus,
  removeLink, archiveExpiredLinks, getActiveLinks, createSavedLink,
  updateLink,
} from '../saved-links'
import type { SavedLink } from '@/types/saved-link'

const mockLink: SavedLink = {
  id: 'abc-123',
  url: 'https://example.com',
  title: 'Test Link',
  summary: 'A test summary',
  thumbnail: null,
  favicon: null,
  siteName: 'example.com',
  type: 'article',
  tags: ['test'],
  collectionIds: [],
  note: '',
  savedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-08T00:00:00.000Z',
  status: 'active',
  source: 'manual',
}

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('loadLinks', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadLinks()).toEqual([])
  })
  it('returns parsed links from storage', () => {
    mockStorage['drift-saved-links'] = JSON.stringify([mockLink])
    expect(loadLinks()).toEqual([mockLink])
  })
  it('returns empty array on invalid JSON', () => {
    mockStorage['drift-saved-links'] = 'not-json'
    expect(loadLinks()).toEqual([])
  })
})

describe('addLink', () => {
  it('prepends new link to existing links', () => {
    saveLinks([mockLink])
    const newLink = { ...mockLink, id: 'new-1' }
    addLink(newLink)
    expect(loadLinks()[0].id).toBe('new-1')
  })
})

describe('updateLinkStatus', () => {
  it('updates status of matching link', () => {
    saveLinks([mockLink])
    updateLinkStatus('abc-123', 'read')
    expect(loadLinks()[0].status).toBe('read')
  })
  it('does not affect other links', () => {
    const other = { ...mockLink, id: 'other-1' }
    saveLinks([mockLink, other])
    updateLinkStatus('abc-123', 'read')
    expect(loadLinks().find(l => l.id === 'other-1')?.status).toBe('active')
  })
})

describe('removeLink', () => {
  it('removes link by id', () => {
    saveLinks([mockLink])
    removeLink('abc-123')
    expect(loadLinks()).toEqual([])
  })
})

describe('archiveExpiredLinks', () => {
  it('archives active links past their expiry date', () => {
    const expired = { ...mockLink, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([expired])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('archived')
  })
  it('does not archive kept links', () => {
    const kept = { ...mockLink, status: 'kept' as const, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([kept])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('kept')
  })
  it('does not archive read links', () => {
    const read = { ...mockLink, status: 'read' as const, expiresAt: '2020-01-01T00:00:00.000Z' }
    saveLinks([read])
    archiveExpiredLinks()
    expect(loadLinks()[0].status).toBe('read')
  })
})

describe('getActiveLinks', () => {
  it('excludes removed and archived links', () => {
    const archived = { ...mockLink, id: 'a1', status: 'archived' as const }
    const removed = { ...mockLink, id: 'r1', status: 'removed' as const }
    saveLinks([mockLink, archived, removed])
    expect(getActiveLinks()).toHaveLength(1)
    expect(getActiveLinks()[0].id).toBe('abc-123')
  })
})

describe('createSavedLink', () => {
  it('sets id, savedAt, expiresAt, and status', () => {
    const link = createSavedLink({
      url: 'https://example.com', title: 'Test', summary: 'Summary',
      thumbnail: null, favicon: null, siteName: 'example.com',
      type: 'article', tags: [], source: 'manual',
    })
    expect(link.id).toBe('test-uuid-1234')
    expect(link.status).toBe('active')
    expect(link.savedAt).toBeTruthy()
    expect(link.expiresAt).toBeTruthy()
  })
  it('sets expiresAt to 7 days after savedAt', () => {
    const link = createSavedLink({
      url: 'https://example.com', title: 'Test', summary: 'Summary',
      thumbnail: null, favicon: null, siteName: 'example.com',
      type: 'article', tags: [], source: 'manual',
    })
    const diff = new Date(link.expiresAt).getTime() - new Date(link.savedAt).getTime()
    const WEEK = 7 * 24 * 60 * 60 * 1000
    expect(diff).toBeGreaterThanOrEqual(WEEK)
    expect(diff).toBeLessThan(WEEK + 100) // allow up to 100ms execution skew
  })
})

describe('updateLink', () => {
  it('updates note on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { note: 'great resource' })
    expect(loadLinks()[0].note).toBe('great resource')
  })
  it('updates collectionIds on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { collectionIds: ['col-1', 'col-2'] })
    expect(loadLinks()[0].collectionIds).toEqual(['col-1', 'col-2'])
  })
  it('updates tags on matching link', () => {
    saveLinks([mockLink])
    updateLink('abc-123', { tags: ['react', 'auth'] })
    expect(loadLinks()[0].tags).toEqual(['react', 'auth'])
  })
  it('does not affect other links', () => {
    const other = { ...mockLink, id: 'other-1' }
    saveLinks([mockLink, other])
    updateLink('abc-123', { note: 'changed' })
    expect(loadLinks().find(l => l.id === 'other-1')?.note).toBe('')
  })
})
