# Drop Tab — Link Triage Design Spec
Date: 2026-03-26

## Overview

Transform the existing Drop tab from a simple "paste URL → get verdict" screen into a full personal link triage library. The rest of Drift (Feed, Ask, Brain Dump, Profile) remains unchanged except for two additions: a **Save to Links** action on Feed cards, and a **link attachment** feature in the Ask tab.

The core philosophy: links have a lifespan. Save fast, act deliberately, feel done.

---

## Problem

The current Drop tab is a single-shot tool — paste a link, get an AI assessment, done. There's no persistence, no library, no way to come back to things. Users save interesting links across their phone and desktop all day and have no calm, structured way to triage them later.

---

## What Changes

### 1. Drop Tab — Full Link Triage Library

The Drop tab becomes a personal link library with the following sections and behaviour:

#### Layout
- **Context bar** at the top — one-sentence "what are you building right now?" input. Drives relevance ranking of saved links. Editable inline.
- **Search bar** — full-text search across titles and AI-generated summaries
- **Tag filter chips** — scrollable horizontal row. "All" chip selected by default. Each tag is a filter. Multiple tags can be selected.
- **"Relevant to you now"** section — links ranked by relevance to the current context. Full opacity. Shown first.
- **"Other saved"** section — remaining links sorted by recency. Dimmed (70% opacity).
- **Expiry nudge** — amber notice when links are within 24h of auto-archiving ("2 links auto-archive tomorrow — act on them or they'll drift away")

#### Link Cards
Compact horizontal rows. Each card shows:
- **Thumbnail** (60×44px) — OG image, YouTube thumbnail, or fallback icon by content type (📄 article, 🐙 GitHub, 𝕏 tweet, etc.)
- **Video duration badge** overlaid on thumbnail for YouTube links
- **Title** — truncated to one line
- **AI one-liner** — a single sentence summary generated on save
- **Source favicon + domain**
- **Age** — "2h ago", "3d ago"
- **Tags** — small chips inline

#### Card States
- **Default** — full opacity, all buttons inactive
- **Kept** — amber border on card, bookmark icon filled solid
- **Read** — 45% opacity, title struck through, checkmark filled

#### Card Actions (3 icon buttons, bottom-right of card)
| Icon | Action | Behaviour |
|------|--------|-----------|
| ✓ Checkmark (green) | Mark as read | Card fades to read state, satisfying check animation |
| 🔖 Bookmark (amber) | Keep — prevent auto-archive | Toggles. Amber border appears on card. Tap again to un-keep. |
| 🗑 Trash (red) | Remove | Deleted immediately, no confirmation |

#### Auto-Archive
- Links that are not read, kept, or interacted with are automatically archived after **7 days**
- Archived links are not shown in the main feed but remain searchable
- Kept links never auto-archive
- Read links are retained but dimmed — user can trash them anytime

#### Smart Resurfacing
- When the user updates their context, the app re-scores all saved links against the new context
- Links that previously scored low but now match well surface into the "Relevant to you now" section
- No notification — just a quiet re-rank on next open

---

### 2. Save Flow

#### In-App (Paste)
- FAB (floating action button) at bottom of Drop screen — consistent with Brain Dump FAB pattern already in the app
- User taps FAB → paste input sheet slides up → pastes URL → taps Save
- AI processing begins immediately: skeleton card appears in feed while loading
- On completion: card slides into feed at top with a green "✓ Saved — AI tags added" toast
- Auto-suggested tags shown on the card, user can tap to remove or add more

#### Share Sheet (Mobile)
- Drift registered as a Web Share Target via PWA manifest
- On iOS/Android: Share → Drift → URL sent directly to save flow
- AI processing runs in the background
- Card appears in Drop tab next time user opens the app

---

### 3. AI Layer (per saved link)

All processing happens server-side via a Next.js API route on save:

| Step | What happens |
|------|-------------|
| Metadata fetch | OG tags scraped: title, description, image, site name, content type detection |
| One-liner summary | Claude generates a single sentence describing what the link is and why it matters |
| Auto-tagging | Claude suggests 1–3 tags based on content. User can confirm, edit, or ignore. |
| Relevance scoring | A single Claude call scores all active links at once against the current context string. The prompt sends the full list of link titles + summaries and returns a JSON array of `{ id, score }` pairs (0–10). Runs when context changes or on first load. Scores cached in memory for the session — not persisted. Used for ranking only, not shown to user. |

Content type is detected from URL + OG metadata:
- `video` — YouTube, Vimeo, Loom
- `repo` — github.com
- `tweet` — x.com, twitter.com
- `article` — everything else

---

### 4. Ask Tab — Link Attachment

The existing Ask tab design is preserved entirely. Two additions:

**📎 Attach a saved link button**
- Appears above the text input
- Opens a picker showing the user's saved links (compact list, searchable)
- Selected link is shown as a chip above the input
- Can be removed with ✕

**Contextual suggestion chips**
- When no link is attached: general prompts appear as tappable chips
  - "What's the difference between RSC and client components?"
  - "Should I learn Rust as a JS dev?"
  - "Explain MCP to me like I'm a senior dev"
- When a link is attached: chips update to be link-specific
  - "💡 What are the key takeaways?"
  - "🧠 Explain this concept to me"
  - "🎯 Is this relevant to what I'm building?"
  - "⚡ Give me a quick summary"
- Tapping a chip sends it as a message immediately
- User can still type freely regardless

---

### 5. Feed Tab — Save to Links Action

The existing Feed (daily digest) is unchanged. One addition per digest card:

**"Save to Links" action** added alongside existing card actions (Save / Skip / Go Deeper).

- Tapping it sends the link to the Drop library immediately
- AI processing (one-liner + tags) runs in the background
- The Feed card itself does not change state — no visual indication beyond a brief toast
- The link appears in the Drop tab on next visit

---

## Data Model

```ts
interface SavedLink {
  id: string
  url: string
  title: string
  summary: string          // AI one-liner
  thumbnail: string | null // OG image or YouTube thumbnail URL
  favicon: string | null
  siteName: string
  type: 'video' | 'article' | 'repo' | 'tweet' | 'other'
  tags: string[]
  savedAt: string          // ISO date
  expiresAt: string        // savedAt + 7 days
  status: 'active' | 'read' | 'kept' | 'archived' | 'removed'
  relevanceScore: number   // 0–10, computed on load, not stored
  source: 'manual' | 'share' | 'feed'  // how it was saved
}
```

Storage: `localStorage` (consistent with existing Brain Dump and Digest patterns in this codebase). Key: `drift-saved-links`.

---

## Screens & Navigation

Navigation unchanged — 5 tabs: **Home (Feed) · Ask · Drop · Brain Dump · Profile**

| Tab | Change |
|-----|--------|
| Home (Feed) | Add "Save to Links" action to digest cards |
| Ask | Add link attachment + suggestion chips |
| Drop | Full redesign into link triage library |
| Brain Dump | No change |
| Profile | No change |

---

## Out of Scope

- Cloud sync (localStorage only, consistent with rest of app)
- Link previews / full page snapshots
- Sharing links with other users
- Browser extension
- Notifications for expiring links
- Bulk actions (select multiple, batch delete)
- Collections / folders (tags are sufficient for MVP)
