import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkClusterPrompt } from '@/lib/prompts'

interface ClusterRequestBody {
  links: Array<{ id: string; title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { links } = await req.json() as ClusterRequestBody

    if (links.length < 3) {
      return NextResponse.json({ name: null, ids: [] })
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkClusterPrompt(links) }],
      response_format: { type: 'json_object' },
      max_tokens: 256,
    })

    const raw = JSON.parse(completion.choices[0].message.content ?? '{}')
    return NextResponse.json({
      name: typeof raw.name === 'string' ? raw.name : null,
      ids: Array.isArray(raw.ids) ? raw.ids : [],
    })
  } catch {
    return NextResponse.json({ name: null, ids: [] })
  }
}
