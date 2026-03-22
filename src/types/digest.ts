export type CardType = 'tool_release' | 'article' | 'video' | 'repo' | 'skill'

export interface DigestCard {
  id: string
  card_type: CardType
  title: string
  summary: string
  relevance_score: number
  relevance_reason: string
  source_url?: string
  metadata: ToolReleaseMetadata | ArticleMetadata | VideoMetadata | RepoMetadata | SkillMetadata
}

export interface ToolReleaseMetadata {
  type: 'tool_release'
  version_from?: string
  version_to?: string
  tool_name: string
  impact: 'high' | 'medium' | 'low'
  source: string
}

export interface ArticleMetadata {
  type: 'article'
  read_time_minutes: number
  source: string
  author?: string
  key_takeaway: string
}

export interface VideoMetadata {
  type: 'video'
  platform: string
  duration_minutes?: number
  channel: string
  topic_tags: string[]
  key_timestamps?: { time: string; label: string }[]
}

export interface RepoMetadata {
  type: 'repo'
  github_url: string
  stars?: number
  language?: string
  use_case: string
}

export interface SkillMetadata {
  type: 'skill'
  why_now: string
  learning_path?: string
}

export type CardAction = 'save' | 'read' | 'go_deeper'

export interface DigestState {
  cards: DigestCard[]
  actions: Record<string, CardAction>
  expandedCards: Set<string>
  isLoading: boolean
  isDone: boolean
  generatedAt?: string
  daySummary?: string
}
