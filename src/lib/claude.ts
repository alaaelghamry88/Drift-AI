import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-sonnet-4-20250514'

export async function streamText(
  messages: Anthropic.MessageParam[],
  system: string,
  onChunk: (text: string) => void,
  tools?: Anthropic.Tool[]
): Promise<string> {
  const params: Anthropic.MessageStreamParams = {
    model: MODEL,
    max_tokens: 4096,
    system,
    messages,
    ...(tools && tools.length > 0 ? { tools } : {}),
  }

  const stream = anthropic.messages.stream(params)
  let fullText = ''

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      fullText += chunk.delta.text
      onChunk(chunk.delta.text)
    }
  }

  return fullText
}

export async function generateJSON<T>(
  messages: Anthropic.MessageParam[],
  system: string,
  tools?: Anthropic.Tool[]
): Promise<T> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages,
    ...(tools && tools.length > 0 ? { tools } : {}),
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textBlock.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                    textBlock.text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T
}

export const webSearchTool: Anthropic.Tool = {
  name: 'web_search',
  description: 'Search the web for current information about developer tools, AI releases, articles, and trends.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      }
    },
    required: ['query']
  }
}

export const webFetchTool: Anthropic.Tool = {
  name: 'web_fetch',
  description: 'Fetch and read the content of a URL.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch'
      }
    },
    required: ['url']
  }
}
