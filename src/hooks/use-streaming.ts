'use client'

import { useState, useCallback } from 'react'

interface StreamOptions {
  onDone?: (data: unknown) => void
}

export function useStreaming() {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stream = useCallback(async (
    fetchFn: () => Promise<Response>,
    options?: StreamOptions
  ): Promise<string> => {
    setText('')
    setError(null)
    setIsStreaming(true)
    let accumulated = ''

    try {
      const response = await fetchFn()
      if (!response.ok) throw new Error('Stream request failed')
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') {
            streamDone = true
            break
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              setError(parsed.error)
              streamDone = true
              break
            }
            if (parsed.done && parsed.assessment) {
              options?.onDone?.(parsed.assessment)
              continue
            }
            if (parsed.text) {
              accumulated += parsed.text
              setText(prev => prev + parsed.text)
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed')
    } finally {
      setIsStreaming(false)
    }
    return accumulated
  }, [])

  const reset = useCallback(() => {
    setText('')
    setError(null)
    setIsStreaming(false)
  }, [])

  return { text, isStreaming, error, stream, reset }
}
