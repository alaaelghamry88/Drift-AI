export interface Collection {
  id: string
  name: string
  emoji: string
  createdAt: string
  source: 'manual' | 'ai-suggested'
}
