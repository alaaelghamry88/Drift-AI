import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkDigestHeadlinePrompt } from '@/lib/prompts'

interface DigestRequestBody {
  links: Array<{ title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { links } = await req.json() as DigestRequestBody

    if (links.length === 0) {
      return NextResponse.json({ headline: '' })
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkDigestHeadlinePrompt(links) }],
      max_tokens: 128,
    })

    const headline = completion.choices[0].message.content?.trim() ?? ''
    return NextResponse.json({ headline })
  } catch {
    return NextResponse.json({ headline: '' })
  }
}
