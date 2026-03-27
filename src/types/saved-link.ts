export type LinkType = 'video' | 'article' | 'repo' | 'tweet' | 'other'
export type LinkStatus = 'active' | 'read' | 'kept' | 'archived' | 'removed'
export type LinkSource = 'manual' | 'share' | 'feed'

export interface SavedLink {
  id: string
  url: string
  title: string
  summary: string
  thumbnail: string | null
  favicon: string | null
  siteName: string
  type: LinkType
  tags: string[]
  savedAt: string    // ISO date
  expiresAt: string  // savedAt + 7 days
  status: LinkStatus
  source: LinkSource
}
