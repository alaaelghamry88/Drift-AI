'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DriftProfile } from '@/types/profile'

const PROFILE_KEY = 'drift_profile'
const CONTEXT_UPDATED_KEY = 'drift_context_updated_at'

export function useProfile() {
  const [profile, setProfile] = useState<DriftProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [contextUpdatedAt, setContextUpdatedAt] = useState<string>('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as DriftProfile
        setProfile(parsed)
        const storedContextUpdatedAt = localStorage.getItem(CONTEXT_UPDATED_KEY)
        setContextUpdatedAt(storedContextUpdatedAt ?? parsed.createdAt)
      }
    } catch {
      // ignore parse errors
    }
    setIsLoaded(true)
  }, [])

  const saveProfile = useCallback((newProfile: DriftProfile) => {
    const updated = { ...newProfile, updatedAt: new Date().toISOString() }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
    setProfile(updated)
  }, [])

  const updateContext = useCallback((context: string) => {
    if (!profile) return
    const updated = { ...profile, currentContext: context, updatedAt: new Date().toISOString() }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
    setProfile(updated)
    const now = new Date().toISOString()
    localStorage.setItem(CONTEXT_UPDATED_KEY, now)
    setContextUpdatedAt(now)
  }, [profile])

  const clearProfile = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(CONTEXT_UPDATED_KEY)
    setProfile(null)
    setContextUpdatedAt('')
  }, [])

  return { profile, isLoaded, saveProfile, updateContext, clearProfile, contextUpdatedAt }
}
