// src/types/brain-dump.ts

export interface NoteEntry {
  id: string
  type: 'note'
  color: string       // hex e.g. '#f5c842'
  text: string
  x: number
  y: number
  rotation: number    // degrees, –3 to +3, fixed at creation
  createdAt: number   // unix ms
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface TodoEntry {
  id: string
  type: 'todo'
  title: string
  items: TodoItem[]
  x: number
  y: number
  rotation: number    // always 0
  createdAt: number
}

export type BrainDumpEntry = NoteEntry | TodoEntry
