import type { DriftProfile } from '@/types/profile'

export interface TavilyResult {
  title: string
  url: string
  content: string
  published_date?: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
}

export function buildSearchQueries(profile: DriftProfile): string[] {
  const year = new Date().getFullYear()
  return [
    'AI tools and LLM news this week',
    `AI ${profile.stack.join(' ')} ${year}`,
    `AI ${profile.currentContext.slice(0, 60)} ${year}`,
    `AI ${profile.stack[0]} tutorial site:youtube.com`,
    'new AI tools for developers site:producthunt.com',
  ]
}

export function deduplicateByUrl(results: TavilyResult[]): TavilyResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

export function sortByRecency(results: TavilyResult[]): TavilyResult[] {
  return [...results].sort((a, b) => {
    if (!a.published_date && !b.published_date) return 0
    if (!a.published_date) return 1
    if (!b.published_date) return -1
    return new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  })
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  if (!process.env.TAVILY_API_KEY) {
    console.error('TAVILY_API_KEY is not set — skipping Tavily search')
    return []
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 7,
        topic: 'news',
        days: 7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      console.warn(`Tavily search failed for query "${query}": ${res.status}`)
      return []
    }

    const data = await res.json() as TavilyResponse
    return data.results ?? []
  } catch (err) {
    console.warn(`Tavily search error for query "${query}":`, err)
    return []
  } finally {
    clearTimeout(timer)
  }
}

function filterThisWeek(results: TavilyResult[]): TavilyResult[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return results.filter(r => {
    if (!r.published_date) return true // keep undated results
    return new Date(r.published_date).getTime() >= cutoff
  })
}

export async function fetchAINews(profile: DriftProfile): Promise<TavilyResult[]> {
  const queries = buildSearchQueries(profile)
  const settled = await Promise.allSettled(queries.map(searchTavily))
  const all = settled
    .filter((r): r is PromiseFulfilledResult<TavilyResult[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
  const unique = deduplicateByUrl(all)
  const thisWeek = filterThisWeek(unique)
  const sorted = sortByRecency(thisWeek)
  return sorted.slice(0, 20)
}
