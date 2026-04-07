# Drop Tab — Collections, Notes & Digest Design

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

Enhance the Drop tab (personal link library) with three interlocking improvements:

1. **Collections** — user-named buckets to organise links, surfaced as a horizontal pill bar
2. **Save-time enrichment** — note and collection assignment via an inline expand on the newly saved card
3. **AI clustering + weekly digest** — AI suggests collections from link patterns; a weekly recap banner summarises saving activity

---

## Data Model

### New `Collection` type

```ts
interface Collection {
  id: string
  name: string
  emoji: string              // user-picked, e.g. "📚"
  createdAt: string          // ISO date
  source: 'manual' | 'ai-suggested'
}
```

Stored in a new `saved-collections` localStorage key, managed by a new `saved-collections.ts` lib module (mirroring the existing `saved-links.ts` pattern).

### `SavedLink` additions

```ts
collectionIds: string[]   // a link can belong to multiple collections
note: string              // user's save-time note ("why I saved this")
```

`tags` already exists on `SavedLink` — it becomes user-editable at save-time (currently only set by the API).

---

## Main View Changes

### Collection pill bar

Inserted between the URL input and the existing type filter:

```
[All] [📚 Research] [🔐 Auth] [🎨 Design] [+ New]
```

- **"All"** is the default — shows every active link
- Selecting a collection pill filters the link list to `link.collectionIds.includes(activeCollection)`
- **"+ New"** opens a small inline name + emoji picker, creates a collection and sets it as active
- Pills are horizontally scrollable; the bar never wraps

### Link card additions

- Collection badge shown in the card meta row (top-right) when the link belongs to one or more collections
- Saved note rendered below the title as an italicised left-bordered line (only if note is non-empty)
- New **assign action button** (⊕) in the card actions row — opens a small collection picker sheet to add/remove the link from collections after save

### AI clustering nudge

When the AI detects 3+ thematically related links not yet in a collection, a nudge banner appears between the type filter and the link sections:

```
✦  3 links look like "Security patterns" — create collection?   [Create →]
```

- Non-blocking — can be dismissed
- Tapping "Create →" creates the suggested collection and pre-assigns the matching links
- Triggers at most once per session per suggestion to avoid noise

---

## Save Flow

Current behaviour (paste URL → instant save) is preserved. After the metadata fetch resolves, the newly saved card **briefly expands inline** to show an enrichment area:

- **Note field** — `"Why are you saving this?"` placeholder
- **Collection picker** — existing collection pills + "+ New"
- **Tags** — pre-filled from API, user-editable

The expansion auto-collapses after 8 seconds of inactivity or on explicit dismiss (tap elsewhere / swipe down). All fields are optional — skipping saves the link with no note, no collection, and API-inferred tags.

---

## Weekly Digest

### Trigger

Appears as a banner card at the top of the Drop tab (above the collection pill bar) after the user has saved 7 or more links in the past 7 days. Dismissed state is persisted in localStorage with a timestamp — won't re-appear until 7 days after the last dismissal.

### Banner

```
📊  This week's recap        →
    12 saved · 4 unread · 2 collections
```

### Full digest sheet

Tapping the banner opens a bottom sheet with:

- **Week label** — "Week of Apr 7"
- **AI headline** — one-sentence summary of the week's saving themes (generated via `/api/links/digest`)
- **Per-collection breakdown** — collection name, link count, list of titles with unread badges
- **Uncollected links** — any links not assigned to a collection, shown under "Other"
- **CTA** — "Mark all read" button

### API route

New `POST /api/links/digest` — accepts the week's links (titles + summaries), returns `{ headline: string }`.

---

## Architecture Notes

- All new state lives in localStorage (consistent with `saved-links` pattern) — no backend changes to the persistence layer
- `saved-collections.ts` exports: `loadCollections`, `addCollection`, `updateCollection`, `removeCollection`, `getCollections`
- `SavedLink` type additions are backwards-compatible: `collectionIds` defaults to `[]`, `note` defaults to `""`
- The AI clustering suggestion runs client-side via a new `POST /api/links/cluster` route, called lazily (after page load, not blocking render)

---

## Out of Scope

- Nested collections / sub-folders
- Sharing collections with other users
- Collection-level expiry overrides
- Push notifications for the weekly digest
