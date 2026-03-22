import { NextRequest } from 'next/server'
import { groq, MODEL } from '@/lib/claude'
import { linkAssessmentSystemPrompt } from '@/lib/prompts'
import { stripHtml } from '@/lib/html-strip'
import type { DriftProfile } from '@/types/profile'

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return '(Content could not be retrieved.)'
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 0 ? text : '(Content could not be retrieved.)'
  } catch {
    return '(Content could not be retrieved.)'
  }
}

export async function POST(req: NextRequest) {
  const { profile, url } = await req.json() as { profile: DriftProfile; url: string }

  const content = await fetchPageContent(url)
  const userMessage = content === '(Content could not be retrieved.)'
    ? `Assess this URL for me: ${url}\n\n(Content could not be retrieved.)`
    : `Assess this URL for me: ${url}\n\nCONTENT:\n${content}`

  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: linkAssessmentSystemPrompt(profile) },
      { role: 'user', content: userMessage }
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
            const data = JSON.stringify({ text, partial: true })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        try {
          const jsonMatch = buffer.match(/```json\n?([\s\S]*?)\n?```/) ||
                            buffer.match(/(\{[\s\S]*\})/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
            const doneData = JSON.stringify({ done: true, assessment: parsed })
            controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          }
        } catch {
          // couldn't parse JSON, send raw
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
