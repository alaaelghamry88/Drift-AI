import { NextRequest } from 'next/server'
import { openrouter, VERDICT_MODEL } from '@/lib/ai'
import { verdictSystemPrompt, followUpSystemPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'

export async function POST(req: NextRequest) {
  const { profile, query, messages: prevMessages } = await req.json() as {
    profile: DriftProfile
    query: string
    messages?: { role: 'user' | 'assistant'; content: string }[]
  }

  const messages = prevMessages || [{ role: 'user' as const, content: query }]
  const isFollowUp = messages.length > 1

  const stream = await openrouter.chat.completions.create({
    model: VERDICT_MODEL,
    max_tokens: isFollowUp ? 512 : 2048,
    messages: [
      { role: 'system', content: isFollowUp ? followUpSystemPrompt(profile) : verdictSystemPrompt(profile) },
      ...messages,
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  let buffer = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            buffer += text
            const data = JSON.stringify({ text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        if (!isFollowUp) {
          try {
            const jsonMatch = buffer.match(/```json\n?([\s\S]*?)\n?```/) ||
                              buffer.match(/(\{[\s\S]*\})/)
            if (jsonMatch) {
              const verdict = JSON.parse(jsonMatch[1] || jsonMatch[0])
              const doneData = JSON.stringify({ done: true, verdict })
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
            }
          } catch {
            // couldn't parse verdict JSON
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const errData = JSON.stringify({ error: String(err) })
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
