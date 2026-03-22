import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODEL } from '@/lib/claude'
import { digestSystemPrompt, digestUserPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard } from '@/types/digest'

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json() as { profile: DriftProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile required' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8096,
      system: digestSystemPrompt(profile),
      messages: [
        { role: 'user', content: digestUserPrompt(profile) }
      ],
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for current developer news, tool releases, and AI content.',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          }
        }
      ],
      tool_choice: { type: 'auto' }
    })

    // Handle tool use loop
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: digestUserPrompt(profile) }
    ]
    let currentResponse = response

    while (currentResponse.stop_reason === 'tool_use') {
      const toolUses = currentResponse.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map(tool => ({
        type: 'tool_result' as const,
        tool_use_id: tool.id,
        content: `Search results for "${(tool.input as { query: string }).query}": [Recent developer news and tool releases relevant to the query]`
      }))

      messages.push({ role: 'assistant', content: currentResponse.content })
      messages.push({ role: 'user', content: toolResults })

      currentResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8096,
        system: digestSystemPrompt(profile),
        messages,
        tools: [
          {
            name: 'web_search',
            description: 'Search the web for current developer news.',
            input_schema: {
              type: 'object' as const,
              properties: {
                query: { type: 'string' }
              },
              required: ['query']
            }
          }
        ],
      })
    }

    const textBlock = currentResponse.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response')
    }

    const jsonMatch = textBlock.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      textBlock.text.match(/(\[[\s\S]*\])/)

    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const cards: DigestCard[] = JSON.parse(jsonMatch[1] || jsonMatch[0])

    // Ensure unique IDs
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
