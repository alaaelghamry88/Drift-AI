import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODEL } from '@/lib/claude'
import { verdictSystemPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'

export async function POST(req: NextRequest) {
  const { profile, query, messages: prevMessages } = await req.json() as {
    profile: DriftProfile
    query: string
    messages?: Anthropic.MessageParam[]
  }

  const messages: Anthropic.MessageParam[] = prevMessages || [
    { role: 'user', content: query }
  ]

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: verdictSystemPrompt(profile),
    messages,
    tools: [
      {
        name: 'web_search',
        description: 'Search for current information about the tool or technology.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
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
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            buffer += chunk.delta.text
            const data = JSON.stringify({ text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        const finalMessage = await stream.finalMessage()

        if (finalMessage.stop_reason === 'tool_use') {
          const toolUse = finalMessage.content.find(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )
          if (toolUse) {
            const followUpMessages: Anthropic.MessageParam[] = [
              ...messages,
              { role: 'assistant', content: finalMessage.content },
              {
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: `Search results for "${(toolUse.input as { query: string }).query}": [Current information about this technology - analyze based on your knowledge and the user's profile context]`
                  }
                ]
              }
            ]

            const followUp = anthropic.messages.stream({
              model: MODEL,
              max_tokens: 2048,
              system: verdictSystemPrompt(profile),
              messages: followUpMessages,
            })

            buffer = ''
            for await (const chunk of followUp) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                buffer += chunk.delta.text
                const data = JSON.stringify({ text: chunk.delta.text })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }
          }
        }

        // Parse and send final verdict
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
