import { NextRequest, NextResponse } from 'next/server'
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
import { linkScoringPrompt } from '@/lib/prompts'

interface ScoreRequestBody {
  context: string
  links: Array<{ id: string; title: string; summary: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { context, links } = await req.json() as ScoreRequestBody

    if (!context.trim() || links.length === 0) {
      return NextResponse.json([])
    }

    const completion = await openrouter.chat.completions.create({
      model: DIGEST_MODEL,
      messages: [{ role: 'user', content: linkScoringPrompt(context, links) }],
      response_format: { type: 'json_object' },
      max_tokens: 512,
    })

    const raw = JSON.parse(completion.choices[0].message.content ?? '[]')
    // Groq json_object mode wraps arrays — handle both shapes
    const scores: Array<{ id: string; score: number }> = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.scores)
        ? raw.scores
        : []

    return NextResponse.json(scores)
  } catch {
    return NextResponse.json([])
  }
}
