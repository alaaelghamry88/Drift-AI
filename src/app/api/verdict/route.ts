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
  // Full accumulated text — kept intact for JSON extraction at the end
  let buffer = ''
  // Pending input being scanned for <think> tags before emitting to client
  let pending = ''
  let inThink = false

  function flush(controller: ReadableStreamDefaultController, final = false): void {
    let visible = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (inThink) {
        const close = pending.indexOf('</think>')
        if (close >= 0) {
          inThink = false
          pending = pending.slice(close + 8)
          // skip the single newline that typically follows </think>
          if (pending.startsWith('\n')) pending = pending.slice(1)
        } else {
          break // still inside <think>, wait for more chunks
        }
      } else {
        const open = pending.indexOf('<think>')
        if (open >= 0) {
          visible += pending.slice(0, open)
          inThink = true
          pending = pending.slice(open + 7)
        } else {
          // No open tag found. On non-final flushes, hold back enough chars
          // to detect a '<think>' that may be split across two chunks (6 chars).
          const hold = final ? 0 : Math.min(6, pending.length)
          visible += pending.slice(0, pending.length - hold)
          pending = pending.slice(pending.length - hold)
          break
        }
      }
    }

    if (visible) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: visible })}\n\n`))
    }
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            buffer += text
            pending += text
            flush(controller)
          }
        }
        flush(controller, true)

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
