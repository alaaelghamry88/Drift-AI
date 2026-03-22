import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODEL } from '@/lib/claude'
import { linkAssessmentSystemPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'

export async function POST(req: NextRequest) {
  const { profile, url } = await req.json() as { profile: DriftProfile; url: string }

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: linkAssessmentSystemPrompt(profile),
    messages: [
      {
        role: 'user',
        content: `Assess this URL for me: ${url}`
      }
    ],
    tools: [
      {
        name: 'web_fetch',
        description: 'Fetch and read the content of a URL.',
        input_schema: {
          type: 'object' as const,
          properties: {
            url: { type: 'string', description: 'The URL to fetch' }
          },
          required: ['url']
        }
      }
    ],
    tool_choice: { type: 'auto' }
  })

  const encoder = new TextEncoder()
  let buffer = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [
          { role: 'user', content: `Assess this URL for me: ${url}` }
        ]

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            buffer += chunk.delta.text
            const data = JSON.stringify({ text: chunk.delta.text, partial: true })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        // If we got tool use, handle it
        const finalMessage = await stream.finalMessage()
        if (finalMessage.stop_reason === 'tool_use') {
          const toolUse = finalMessage.content.find(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )
          if (toolUse) {
            messages.push({ role: 'assistant', content: finalMessage.content })
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: `Content from ${url}: [Article/video content fetched successfully. Analyze based on the URL and your knowledge.]`
                }
              ]
            })

            const followUp = anthropic.messages.stream({
              model: MODEL,
              max_tokens: 2048,
              system: linkAssessmentSystemPrompt(profile),
              messages,
            })

            buffer = ''
            for await (const chunk of followUp) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                buffer += chunk.delta.text
                const data = JSON.stringify({ text: chunk.delta.text, partial: true })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }
          }
        }

        // Try to parse final JSON from buffer
        try {
          const jsonMatch = buffer.match(/```json\n?([\s\S]*?)\n?```/) ||
                            buffer.match(/(\{[\s\S]*\})/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
            const doneData = JSON.stringify({ done: true, assessment: parsed })
            controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          }
        } catch {
          // Couldn't parse JSON, send raw
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
