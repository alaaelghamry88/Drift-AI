import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkProcessingPrompt } from '@/lib/prompts'
import type { LinkType } from '@/types/saved-link'

interface SaveRequestBody {
  url: string
  prefetchedTitle?: string
  prefetchedSummary?: string
}

interface OGMetadata {
  title: string
  description: string
  image: string | null
  siteName: string
  favicon: string | null
}

function detectType(url: string): LinkType {
  try {
    const { hostname } = new URL(url)
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(hostname)) return 'video'
    if (/github\.com/.test(hostname)) return 'repo'
    if (/x\.com|twitter\.com/.test(hostname)) return 'tweet'
  } catch { /* ignore */ }
  return 'article'
}

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
}

function extractOGMetadata(html: string, url: string): OGMetadata {
  const getOG = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
    return m?.[1]?.trim() ?? null
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)

  let favicon: string | null = null
  if (faviconMatch?.[1]) {
    try { favicon = new URL(faviconMatch[1], url).href } catch { /* ignore */ }
  }
  if (!favicon) {
    try { favicon = new URL('/favicon.ico', url).href } catch { /* ignore */ }
  }

  return {
    title: getOG('title') ?? titleMatch?.[1]?.trim() ?? url,
    description: getOG('description') ?? '',
    image: getOG('image') ?? null,
    siteName: getOG('site_name') ?? (new URL(url).hostname.replace('www.', '')),
    favicon,
  }
}

async function fetchMetadata(url: string): Promise<OGMetadata> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DriftBot/1.0)' },
    })
    if (!res.ok) throw new Error('fetch failed')
    const html = await res.text()
    return extractOGMetadata(html, url)
  } catch {
    try {
      const hostname = new URL(url).hostname.replace('www.', '')
      return { title: url, description: '', image: null, siteName: hostname, favicon: null }
    } catch {
      return { title: url, description: '', image: null, siteName: '', favicon: null }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, prefetchedTitle, prefetchedSummary } = await req.json() as SaveRequestBody

    const meta = await fetchMetadata(url)
    const title = prefetchedTitle ?? meta.title
    const description = meta.description

    const ytThumb = getYouTubeThumbnail(url)
    const thumbnail = ytThumb ?? meta.image

    let summary = prefetchedSummary ?? ''
    let tags: string[] = []
    let type: LinkType = detectType(url)

    try {
      const completion = await openrouter.chat.completions.create({
        model: DIGEST_MODEL,
        messages: [{ role: 'user', content: linkProcessingPrompt(url, title, description) }],
        response_format: { type: 'json_object' },
        max_tokens: 256,
      })
      const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
      if (raw.summary) summary = raw.summary
      if (['video', 'article', 'repo', 'tweet', 'other'].includes(raw.type)) {
        type = raw.type as LinkType
      }
    } catch {
      // fall back to empty summary + empty tags
    }

    return NextResponse.json({ title, summary, tags, type, thumbnail, favicon: meta.favicon, siteName: meta.siteName })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
