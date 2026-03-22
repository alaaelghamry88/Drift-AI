export type VerdictType = 'YES' | 'NOT_YET' | 'SKIP'
export type ConfidenceLevel = 'High' | 'Medium'

export interface Verdict {
  id: string
  query: string
  verdict: VerdictType
  confidence: ConfidenceLevel
  for_you: string
  case_for: string
  case_against: string
  alternative?: string
  createdAt: string
}

export interface LinkAssessment {
  url: string
  content_type: 'video' | 'article' | 'repo' | 'post' | 'other'
  title: string
  summary: string
  relevance_score: number
  verdict: 'worth_your_time' | 'save_for_later' | 'skip'
  verdict_reason: string
  save_to_digest: boolean
}

export interface StoredLinkAssessment extends LinkAssessment {
  assessedAt: string // ISO date string — set client-side at persist time
}
