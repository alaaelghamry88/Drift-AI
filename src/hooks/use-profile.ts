'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DriftProfile } from '@/types/profile'

const PROFILE_KEY = 'drift_profile'

export function useProfile() {
  const [profile, setProfile] = useState<DriftProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (stored) {
        setProfile(JSON.parse(stored))
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
  }, [profile])

  const clearProfile = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY)
    setProfile(null)
  }, [])

  return { profile, isLoaded, saveProfile, updateContext, clearProfile }
}
