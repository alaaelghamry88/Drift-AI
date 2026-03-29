const ACTIVITY_LOG_KEY = 'drift_activity_log'
const MAX_DAYS = 90

export type ActivityAction = 'link_saved' | 'link_read' | 'link_kept' | 'link_removed' | 'verdict_made'

export interface ActivityEntry {
  action: ActivityAction
  timestamp: string // ISO
}

export interface WeeklyStats {
  linksSaved: number
  linksTriaged: number
  verdictsMade: number
}

function loadLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY)
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : []
  } catch {
    return []
  }
}

function pruneOldEntries(entries: ActivityEntry[]): ActivityEntry[] {
  const cutoff = Date.now() - MAX_DAYS * 24 * 60 * 60 * 1000
  return entries.filter(e => new Date(e.timestamp).getTime() >= cutoff)
}

function saveLog(entries: ActivityEntry[]): void {
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries))
  } catch {
    // storage unavailable
  }
}

export function logActivity(action: ActivityAction): void {
  const entries = pruneOldEntries(loadLog())
  entries.push({ action, timestamp: new Date().toISOString() })
  saveLog(entries)
}

export function getWeeklyStats(): WeeklyStats {
  const entries = loadLog()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = entries.filter(e => new Date(e.timestamp).getTime() >= weekAgo)

  return {
    linksSaved: thisWeek.filter(e => e.action === 'link_saved').length,
    linksTriaged: thisWeek.filter(e =>
      e.action === 'link_read' || e.action === 'link_kept' || e.action === 'link_removed'
    ).length,
    verdictsMade: thisWeek.filter(e => e.action === 'verdict_made').length,
  }
}

export function getCurrentStreak(): number {
  const entries = loadLog()
  if (entries.length === 0) return 0

  // Collect unique calendar days (YYYY-MM-DD in local time) that have activity
  const activeDays = new Set(
    entries.map(e => new Date(e.timestamp).toLocaleDateString('en-CA'))
  )

  // Walk backwards from today counting consecutive active days
  let streak = 0
  const today = new Date()
  for (let i = 0; i < MAX_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toLocaleDateString('en-CA')
    if (activeDays.has(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}
