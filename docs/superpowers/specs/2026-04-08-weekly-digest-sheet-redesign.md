# Weekly Digest Sheet Redesign

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** `src/components/links/weekly-digest-banner.tsx` + `src/app/api/links/digest/route.ts`

---

## Goal

Replace the current bottom sheet (which shows raw stats and a flat link list) with a two-section design:

1. An AI-generated **narrative pill** that tells the story of the user's week in themes.
2. A **curated reading list** of unread links ranked by relevance to `profile.currentContext`, each shown with its summary and content-type badge.

---

## API Changes — `/api/links/digest`

### Request body (extended)

```ts
interface DigestRequestBody {
  links: Array<{
    id: string
    title: string
    summary: string
    type: LinkType       // 'video' | 'article' | 'repo' | 'tweet' | 'other'
    status: LinkStatus   // 'active' | 'read' | 'kept' | 'archived' | 'removed'
  }>
  currentContext: string  // from profile.currentContext
}
```

### Response body (extended)

```ts
interface DigestResponse {
  narrative: string      // 2-3 sentence paragraph about the week's themes
  relevantIds: string[]  // unread link IDs ordered by relevance to currentContext
}
```

### Prompt changes

The prompt must instruct the model to:
- Write a 2-3 sentence narrative paragraph describing recurring themes and topics the user gravitated toward this week. Bold key topics using `**word**` markdown (rendered as `<strong>` in the UI).
- From the unread links (`status === 'active'`), return their IDs ranked by semantic relevance to `currentContext`. All unread IDs must be returned (so the client can display the full list).
- Return JSON: `{ "narrative": "...", "relevantIds": ["id1", "id2", ...] }`.

`max_tokens` should increase from 128 to ~400 to accommodate the narrative + ID list.

---

## Component Changes — `WeeklyDigestBanner`

### New props / data flow

- Call `useProfile()` inside the component to get `profile.currentContext`. If `profile` is null or `currentContext` is empty, send an empty string — the model will still generate a narrative but without relevance ranking context (it falls back to recency order for `relevantIds`).
- Pass `currentContext` and enriched link data (including `id`, `type`, `status`) in the API request body.
- State shape:

```ts
const [digest, setDigest] = useState<{ narrative: string; relevantIds: string[] } | null>(null)
```

Replace the existing `headline` state.

### Sheet layout

```
┌─────────────────────────────────┐
│  [drag handle]                  │
│  WEEK RECAP          [✕]        │
│  Your week in links             │
│                                 │
│  ┌─────────────────────────┐   │
│  │ APR 1 – APR 8           │   │  ← narrative pill
│  │ You gravitated toward   │   │    gradient bg, teal glow
│  │ system design and AI…   │   │    skeleton while loading
│  └─────────────────────────┘   │
│                                 │
│  RELEVANT TO WHAT YOU'RE        │
│  BUILDING                       │
│                                 │
│  ┌──┬───────────────┬───────┐  │
│  │🖼│ Link title    │Article│  │  ← pick card
│  │  │ Summary text… │       │  │
│  └──┴───────────────┴───────┘  │
│  ┌──┬───────────────┬───────┐  │
│  │▶️│ Link title    │ Video │  │
│  │  │ Summary text… │       │  │
│  └──┴───────────────┴───────┘  │
│  … (scrollable)                │
└─────────────────────────────────┘
```

### Loading behaviour

- Sheet opens → API fires immediately (same trigger as before: `!sheetOpen || digest` guard).
- **Cards:** render immediately from local unread links sorted by recency. Re-sort by `relevantIds` order once the API responds, animated with Framer Motion `layout` prop.
- **Narrative pill:** shows a `animate-pulse` skeleton (two lines, `bg-white/[0.06]`) until `narrative` arrives, then fades in with `opacity: 0 → 1`.

### Card design

Each pick card:
- **Icon:** 32×32 rounded square. Use `favicon` if available (rendered as `<img>`), fall back to a type emoji (📄 article, ▶️ video, ⚙️ repo, 🐦 tweet, 🔗 other).
- **Title:** 12.5px semibold, single line, truncated.
- **Summary:** 11px, 2-line clamp, `text-drift-text-tertiary`.
- **Type badge:** small uppercase pill, coloured per type:
  - Article → teal (`text-drift-accent / bg-drift-accent/10`)
  - Video → gold (`text-drift-gold / bg-drift-gold/10`)
  - Repo → blue-grey (`text-drift-text-secondary / bg-white/[0.06]`)
  - Tweet → blue (`text-blue-400 / bg-blue-400/10`)
  - Other → muted (`text-drift-text-tertiary / bg-white/[0.04]`)
- Tapping the card opens `link.url` in a new tab.

### Narrative pill design

- Background: `linear-gradient(135deg, drift-accent/9% → drift-elevated/30%)`
- Border: `drift-accent/16%`
- Radius: `rounded-2xl`
- Decorative radial glow in top-right corner (CSS `::before` or inline `<div>` absolutely positioned).
- Date range label: `APR 1 – APR 8` in 9px uppercase teal. Computed client-side: lower bound = `Date.now() - WEEK_MS`, upper bound = `Date.now()`. Formatted as `MMM D – MMM D` using `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`.
- Narrative text: 12.5px, `text-drift-text-secondary`, line-height 1.68. Key topic words arrive pre-bolded from the model (model wraps them in `**word**`); render by replacing `**word**` → `<strong className="text-drift-accent">word</strong>` on the client.

---

## What Does NOT Change

- The banner trigger row (the compact "This week's recap" pill) is unchanged.
- Dismiss logic (`DISMISS_KEY`, 7-day window) is unchanged.
- `getRecentLinks` (7-day window) is unchanged.
- `MIN_LINKS` threshold is unchanged.
- The backdrop + spring animation for the sheet opening/closing is unchanged.

---

## Out of Scope

- Collection grouping section (removed — replaced by the relevance-ranked list).
- Stats row ("8 saved · 3 unread · 2 collections") removed from the sheet header.
- No pagination or "show all" toggle — show all unread links, scrollable.
