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
  collectionIds: string[]   // new — defaults to []
  note: string              // new — defaults to ''
  savedAt: string
  expiresAt: string
  status: LinkStatus
  source: LinkSource
}
