'use client'

import { useProfile } from '@/hooks/use-profile'
import { DigestScreen } from '@/components/digest/digest-screen'

export default function HomePage() {
  const { profile, updateContext, contextUpdatedAt } = useProfile()
  if (!profile) return null
  return (
    <DigestScreen
      profile={profile}
      onUpdateContext={updateContext}
      contextUpdatedAt={contextUpdatedAt}
    />
  )
}
