import { NextRequest } from 'next/server'
import { anthropic, MODEL } from '@/lib/claude'
import { buildProfileContext } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'
import type { DigestCard } from '@/types/digest'

export async function POST(req: NextRequest) {
  const { profile, card } = await req.json() as { profile: DriftProfile; card: DigestCard }

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: `You are Drift — a senior developer advisor.

${buildProfileContext(profile)}

Give a deeper, more complete explanation of a content item. Be specific to the user's stack and context. Keep it under 200 words. No headers. Just clear, useful prose.`,
    messages: [
      {
        role: 'user',
        content: `Go deeper on this item for me:

Title: ${card.title}
Summary: ${card.summary}
Why it's relevant to me: ${card.relevance_reason}

Give me a deeper explanation that's specifically useful for my situation.`
      }
    ]
  })

  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const data = JSON.stringify({ text: chunk.delta.text })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
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
