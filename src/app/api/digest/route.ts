import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { digestSystemPrompt, digestUserPrompt } from '@/lib/prompts'
import { fetchAINews } from '@/lib/tavily'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard } from '@/types/digest'

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json() as { profile: DriftProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile required' }, { status: 400 })
    }

    const articles = await fetchAINews(profile)
    const hasArticles = articles.length > 0

    if (!hasArticles) {
      console.warn('Tavily returned no results — falling back to LLM-only digest')
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 8096,
      messages: [
        { role: 'system', content: digestSystemPrompt(profile) },
        { role: 'user', content: digestUserPrompt(profile, articles) }
      ],
    })

    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No text response')

    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/(\[[\s\S]*\])/)

    if (!jsonMatch) throw new Error('No JSON array found in response')

    const cards: DigestCard[] = JSON.parse(jsonMatch[1] || jsonMatch[0])

    const cardsWithIds = cards.map((card, i) => ({
      ...card,
      id: card.id || `card-${Date.now()}-${i}`
    }))

    return NextResponse.json({
      cards: cardsWithIds,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Digest generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    )
  }
}
