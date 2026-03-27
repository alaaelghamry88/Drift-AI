'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addLink, createSavedLink } from '@/lib/saved-links'

export default function SharePage() {
  const router = useRouter()
  const params = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    // Prefer explicit `url` param; fall back to `text` (some share sheets put the URL there)
    const url = params.get('url') || params.get('text') || ''

    if (!url) {
      router.replace('/drop')
      return
    }

    // Validate
    try { new URL(url) } catch {
      router.replace('/drop')
      return
    }

    async function save() {
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const meta = res.ok ? await res.json() : {}
        const link = createSavedLink({
          url,
          title: meta.title ?? url,
          summary: meta.summary ?? '',
          thumbnail: meta.thumbnail ?? null,
          favicon: meta.favicon ?? null,
          siteName: meta.siteName ?? new URL(url).hostname,
          type: meta.type ?? 'other',
          tags: meta.tags ?? [],
          source: 'share',
        })
        addLink(link)
      } catch {
        // Fallback: save minimal link so the user doesn't lose it
        const link = createSavedLink({
          url,
          title: url,
          summary: '',
          thumbnail: null,
          favicon: null,
          siteName: new URL(url).hostname,
          type: 'other',
          tags: [],
          source: 'share',
        })
        addLink(link)
      } finally {
        router.replace('/drop')
      }
    }

    save()
  }, [params, router])

  return (
    <div className="min-h-screen bg-drift-base flex items-center justify-center">
      <p className="text-body text-drift-text-tertiary">Saving link…</p>
    </div>
  )
}
