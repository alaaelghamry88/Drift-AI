'use client'

import { useState, useCallback } from 'react'
import type { DigestCard, CardAction } from '@/types/digest'
import type { DriftProfile } from '@/types/profile'

const DIGEST_KEY = 'drift_digest'
const DIGEST_DATE_KEY = 'drift_digest_date'

interface StoredDigest {
  cards: DigestCard[]
  generatedAt: string
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function loadStoredDigest(): StoredDigest | null {
  try {
    const date = localStorage.getItem(DIGEST_DATE_KEY)
    if (date !== getTodayKey()) return null
    const stored = localStorage.getItem(DIGEST_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function useDigest(profile: DriftProfile) {
  const [cards, setCards] = useState<DigestCard[]>([])
  const [actions, setActions] = useState<Record<string, CardAction>>({})
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [deeperContent, setDeeperContent] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const pendingCards = cards.filter(c => !actions[c.id])
  const isDone = cards.length > 0 && pendingCards.length === 0

  const loadDigest = useCallback(async () => {
    // Check if we have today's digest cached
    const stored = loadStoredDigest()
    if (stored) {
      setCards(stored.cards)
      setGeneratedAt(stored.generatedAt)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })

      if (!res.ok) throw new Error('Failed to fetch digest')

      const data = await res.json() as { cards: DigestCard[]; generatedAt: string }
      setCards(data.cards)
      setGeneratedAt(data.generatedAt)

      // Cache today's digest
      localStorage.setItem(DIGEST_KEY, JSON.stringify({ cards: data.cards, generatedAt: data.generatedAt }))
      localStorage.setItem(DIGEST_DATE_KEY, getTodayKey())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load digest')
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  const performAction = useCallback((cardId: string, action: CardAction) => {
    setActions(prev => ({ ...prev, [cardId]: action }))
  }, [])

  const toggleExpanded = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  const streamDeeper = useCallback(async (card: DigestCard) => {
    if (deeperContent[card.id]) {
      toggleExpanded(card.id)
      return
    }

    toggleExpanded(card.id)
    setDeeperContent(prev => ({ ...prev, [card.id]: '' }))

    try {
      const res = await fetch('/api/deeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, card }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6)) as { text?: string }
              if (parsed.text) {
                setDeeperContent(prev => ({
                  ...prev,
                  [card.id]: (prev[card.id] || '') + parsed.text
                }))
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      console.error('Deeper stream error:', err)
    }
  }, [profile, deeperContent, toggleExpanded])

  const refreshDigest = useCallback(async () => {
    localStorage.removeItem(DIGEST_KEY)
    localStorage.removeItem(DIGEST_DATE_KEY)
    setCards([])
    setActions({})
    setExpandedCards(new Set())
    setDeeperContent({})
    await loadDigest()
  }, [loadDigest])

  return {
    cards,
    actions,
    expandedCards,
    deeperContent,
    isLoading,
    error,
    isDone,
    generatedAt,
    pendingCards,
    loadDigest,
    performAction,
    toggleExpanded,
    streamDeeper,
    refreshDigest,
  }
}
