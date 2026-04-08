import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkWeeklyDigestPrompt } from '@/lib/prompts'

interface DigestRequestBody {
  links: Array<{ id: string; title: string; summary: string; type: string; status: string }>
  currentContext: string
}

interface DigestResponse {
  narrative: string
  relevantIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { links, currentContext } = await req.json() as DigestRequestBody

    if (links.length === 0) {
      return NextResponse.json({ narrative: '', relevantIds: [] } satisfies DigestResponse)
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkWeeklyDigestPrompt(links, currentContext) }],
      max_tokens: 400,
    })

    const raw = completion.choices[0].message.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as DigestResponse
    return NextResponse.json({ narrative: parsed.narrative ?? '', relevantIds: parsed.relevantIds ?? [] })
  } catch {
    return NextResponse.json({ narrative: '', relevantIds: [] } satisfies DigestResponse)
  }
}
