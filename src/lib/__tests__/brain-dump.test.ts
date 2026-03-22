// src/lib/__tests__/brain-dump.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadEntries,
  saveEntries,
  addEntry,
  deleteEntry,
  updateNotePosition,
  updateNoteText,
  updateTodoPosition,
  updateTodoTitle,
  updateTodoItem,
  addTodoItem,
} from '../brain-dump'
import type { NoteEntry, TodoEntry } from '@/types/brain-dump'

const NOTE: NoteEntry = {
  id: 'n1', type: 'note', color: '#f5c842', text: 'Hello', x: 10, y: 20, rotation: -1, createdAt: 1000,
}
const TODO: TodoEntry = {
  id: 't1', type: 'todo', title: 'My list', items: [{ id: 'i1', text: 'Do thing', done: false }],
  x: 50, y: 60, rotation: 0, createdAt: 2000,
}

describe('loadEntries', () => {
  beforeEach(() => localStorage.clear())
  it('returns [] when nothing stored', () => expect(loadEntries()).toEqual([]))
  it('returns parsed entries', () => {
    localStorage.setItem('drift-brain-dump', JSON.stringify([NOTE]))
    expect(loadEntries()).toEqual([NOTE])
  })
  it('returns [] on invalid JSON', () => {
    localStorage.setItem('drift-brain-dump', '{bad')
    expect(loadEntries()).toEqual([])
  })
})

describe('addEntry', () => {
  beforeEach(() => localStorage.clear())
  it('appends a new entry', () => {
    addEntry(NOTE)
    expect(loadEntries()).toEqual([NOTE])
  })
  it('preserves existing entries', () => {
    addEntry(NOTE)
    addEntry(TODO)
    expect(loadEntries()).toHaveLength(2)
  })
})

describe('deleteEntry', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE, TODO]) })
  it('removes the entry by id', () => {
    deleteEntry('n1')
    expect(loadEntries()).toEqual([TODO])
  })
  it('is a no-op for unknown id', () => {
    deleteEntry('nope')
    expect(loadEntries()).toHaveLength(2)
  })
})

describe('updateNotePosition', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE]) })
  it('updates x and y', () => {
    updateNotePosition('n1', 99, 88)
    expect(loadEntries()[0]).toMatchObject({ x: 99, y: 88 })
  })
})

describe('updateNoteText', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([NOTE]) })
  it('updates text', () => {
    updateNoteText('n1', 'Updated')
    const entry = loadEntries()[0] as NoteEntry
    expect(entry.text).toBe('Updated')
  })
})

describe('updateTodoPosition', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('updates x and y', () => {
    updateTodoPosition('t1', 11, 22)
    expect(loadEntries()[0]).toMatchObject({ x: 11, y: 22 })
  })
})

describe('updateTodoTitle', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('updates title', () => {
    updateTodoTitle('t1', 'New title')
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.title).toBe('New title')
  })
})

describe('updateTodoItem', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('toggles done', () => {
    updateTodoItem('t1', 'i1', { done: true })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items[0].done).toBe(true)
  })
  it('updates text', () => {
    updateTodoItem('t1', 'i1', { text: 'Changed' })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items[0].text).toBe('Changed')
  })
})

describe('addTodoItem', () => {
  beforeEach(() => { localStorage.clear(); saveEntries([TODO]) })
  it('appends a new item', () => {
    addTodoItem('t1', { id: 'i2', text: 'New item', done: false })
    const entry = loadEntries()[0] as TodoEntry
    expect(entry.items).toHaveLength(2)
    expect(entry.items[1].text).toBe('New item')
  })
})
