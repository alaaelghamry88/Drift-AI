# Phase 4 — Link Drop: Design Spec

**Date:** 2026-03-22
**Status:** Approved (revised after spec review)

---

## Overview

Phase 4 adds a Link Drop feature to Drift. Users paste any URL into an input; the app fetches the page content server-side, then streams a Groq-powered assessment verdict. All past assessments are persisted to localStorage and shown as cards on the `/drop` page, making it a running history of everything the user has evaluated.

---

## Goals

- Give users a fast way to assess whether any URL is worth their time, in context of their Drift profile
- Persist all past assessments so the drop page doubles as a history feed
- Slot "save for later" links into the DigestScreen as a compact saved links section

---

## Files Changed

### New
- `src/app/(app)/drop/page.tsx` — full drop page with input + history list

### Modified
- `src/app/api/link-drop/route.ts` — add server-side URL fetch before streaming
- `src/components/digest/digest-screen.tsx` — render `LinkDropInput` above the card feed; add saved links section
- `src/hooks/use-streaming.ts` — add optional `onDone` and `onError` SSE event handling

---

## Data

### `LinkAssessment` type — extended for persistence

The existing type in `src/types/verdict.ts` is the API shape. When persisting to localStorage, add `assessedAt`:

```ts
interface StoredLinkAssessment extends LinkAssessment {
  assessedAt: string   // ISO date string, set client-side at persist time
}
```

Do not mutate the existing `LinkAssessment` type — use `StoredLinkAssessment` only in the drop page and DigestScreen saved links section.

### localStorage keys

- `drift_drop_history` — `StoredLinkAssessment[]`, newest first, **capped at 50 items**. Prepend on each new assessment; if length exceeds 50, slice to 50 before storing.

### `save_to_digest` mutation

`save_to_digest` is a field the LLM generates, but users can override it by tapping the "Save to digest" button. When toggled, mutate the item in `drift_drop_history` (find by `url`) and re-persist the full array to localStorage. Use `url` as the lookup key — not `assessedAt` — since `url` is more semantically stable and avoids millisecond-resolution timestamp collisions. This means the persisted value is authoritative — not the original LLM value.

---

## API — `/api/link-drop`

**Change:** Before calling Groq, fetch the submitted URL server-side.

**HTML stripping procedure (in order):**
1. Strip `<script>...</script>` blocks (including content) with: `/(<script[\s\S]*?<\/script>)/gi`
2. Strip `<style>...</style>` blocks (including content) with: `/(<style[\s\S]*?<\/style>)/gi`
3. Strip all remaining HTML tags: `/<[^>]+>/g`
4. Collapse whitespace: `.replace(/\s+/g, ' ').trim()`
5. Truncate the extracted text to **3000 characters** (not the full message — just the extracted content)
6. Append to user message: `\n\nCONTENT:\n<extracted text>`

**Fetch flow:**
1. `fetch(url, { signal: AbortSignal.timeout(5000) })` — 5s hard timeout
2. Read response as text, run procedure above
3. On any failure (timeout, non-200, network error, parse error): fall back to URL-only assessment; append `\n\n(Content could not be retrieved.)` to user message instead

**SSRF note:** The server-side fetch is an unauthenticated request to a user-supplied URL. This is acceptable for a private/single-user app. If deployed publicly, add a blocklist for private IP ranges (169.254.x.x, 10.x.x.x, 192.168.x.x) — that hardening is out of scope for this phase.

**SSE protocol (unchanged):**
- Partial text: `{ text: string, partial: true }`
- Final assessment: `{ done: true, assessment: LinkAssessment }`
- Terminal: `data: [DONE]`
- Error (post-stream): `{ error: string }`

---

## Hook — `useStreaming`

The `stream(fetchFn, options?)` signature gains an optional second argument:

```ts
interface StreamOptions {
  onDone?: (data: unknown) => void
}
```

At the call site in `/drop/page.tsx`, cast: `onDone: (data) => setAssessment(data as LinkAssessment)`. No runtime shape validation is needed — any missing fields from a malformed LLM response will surface as `undefined` in the UI rather than crashing.

**SSE parse order inside the `for (const line of lines)` loop:**

```
1. if data === '[DONE]'  → set a flag to break the outer while loop, break inner loop
2. else parse JSON:
   a. if parsed.error    → call setError(parsed.error), break inner loop
   b. if parsed.done && parsed.assessment → call options?.onDone(parsed.assessment), continue
   c. if parsed.text     → accumulate + setText
```

**[DONE] handling fix:** The current `break` only exits the inner `for...of lines` loop, leaving the outer `while(true)` running. Fix by replacing `while (true)` with `while (!streamDone)` and introducing a flag:

```ts
let streamDone = false
while (!streamDone) {
  const { done, value } = await reader.read()
  if (done) break
  // ... decode + split lines
  for (const line of lines) {
    if (data === '[DONE]') { streamDone = true; break }
    // ... rest of handlers
  }
}
```

Existing callers of `stream(fetchFn)` pass no options — they are unaffected.

---

## Home Screen

Add `<LinkDropInput profile={profile} />` to `DigestScreen`, rendered between the header divider and the card list. It renders persistently regardless of digest state (loading, loaded, done).

`LinkDropInput` already navigates to `/drop?url=<encoded>` on submit — no change needed to the component.

---

## `/drop` Page

### Profile access

The page calls `useProfile()` directly to get `profile` for the API request body. The `(app)/layout.tsx` already handles the auth guard redirect, so the page can assume `profile` is non-null by the time it renders.

### URL param handling

**Suspense requirement:** In Next.js 14 App Router, `useSearchParams()` in a Client Component requires a `<Suspense>` boundary. Add `export const dynamic = 'force-dynamic'` at the top of `drop/page.tsx` to satisfy this without adding a wrapper component.

On mount, read `?url=` from `useSearchParams()`. If present:
- Auto-fill the local URL input state
- Trigger assessment immediately

**Strict Mode double-invoke guard:** Wrap the auto-trigger in a `useRef` flag:

```ts
const hasTriggered = useRef(false)
useEffect(() => {
  if (urlParam && !hasTriggered.current) {
    hasTriggered.current = true
    triggerAssessment(urlParam)
  }
}, [urlParam])
```

### Layout

```
[Input bar — always visible at top]
─────────────────────────────────
[Streaming card — while assessing]   ← only when active
[StoredLinkAssessment card 1 — most recent]
[StoredLinkAssessment card 2]
...
[Empty state — "No links dropped yet" if history is empty and not streaming]
```

### Input bar

A local component within `drop/page.tsx` (not `LinkDropInput` which navigates on submit). Same visual style as `LinkDropInput`. On submit:
- Validates URL (try `new URL(value)` — show inline error if it throws)
- Calls `triggerAssessment(url)` in place
- Does not navigate

Disabled (pointer-events-none + reduced opacity) while `isStreaming` is true.

### Streaming card (in-progress state)

A `DriftCard` at list position 0 — rendered only while `isStreaming`. Shows:
- Header: "Analyzing..." label with a spinner
- Body: streamed text as it arrives, with the blinking cursor (same pattern as "go deeper" in `DigestScreen`)
- On `{ done: true, assessment }`: the streaming card disappears, the new `StoredLinkAssessment` card slides in at position 0

### `VerdictCard` component

Rendered for each `StoredLinkAssessment` in history. Props: `item: StoredLinkAssessment`, `onToggleSave: (url: string) => void`.

The "Save to digest" button uses **local component state** initialised from `item.save_to_digest`. Do not re-read localStorage for the toggle's initial value — use the prop value at mount time. On toggle, call `onToggleSave(item.url)` (the page updates localStorage and re-renders with the new prop value).

- **Top accent line** (same pattern as digest cards): color matches verdict
  - `worth_your_time` → `drift-accent`
  - `save_for_later` → amber
  - `skip` → white/20
- **Header row:** content type badge + `RelevanceScore` component
- **URL subtitle:** `item.url` truncated to 60 chars, `text-drift-text-tertiary text-label`
- **Title** (`text-h2`)
- **Summary** (`text-body`)
- **Verdict pill** — full-width row, color-coded:
  - `worth_your_time` → `text-drift-accent bg-drift-accent/10 border-drift-accent/25`
  - `save_for_later` → `text-amber-400 bg-amber-400/10 border-amber-400/25`
  - `skip` → `text-white/40 bg-white/[0.04] border-white/[0.07]`
- **Verdict reason** (`text-body-sm text-drift-text-secondary`)
- **Action row:**
  - "Save to digest" button — shown on ALL cards (not gated by verdict or LLM flag); its active state reflects local state initialised from `item.save_to_digest`. Tapping calls `onToggleSave(item.url)`.
  - "Open" — `<a href={item.url} target="_blank" rel="noopener noreferrer">`

### Error state on streaming card

If `useStreaming` returns an error (from `parsed.error` SSE event or a fetch failure), replace the streaming card body with:

> "Assessment failed. Check your API key or try again."

With a "Try again" button that re-triggers the same URL.

### Empty state

Shown when `history.length === 0` and `!isStreaming`:
> "No links dropped yet. Paste any URL above to assess it."

---

## DigestScreen — Saved Links Section

On mount, read `drift_drop_history` from localStorage and filter to `save_to_digest === true` items. Re-read on window `focus` event to pick up changes made on the `/drop` page. The effect must clean up the listener on unmount:

```ts
useEffect(() => {
  const read = () => { /* read + filter localStorage */ }
  read()
  window.addEventListener('focus', read)
  return () => window.removeEventListener('focus', read)
}, [])
```

Renders above the AI-generated cards (or above the empty/loading state) — but only if at least one saved item exists.

**Section header:** "Saved Links" with a chevron toggle. **Default state: open.**

Each saved link renders as a compact row:
- Content type icon + title (`text-body-sm`)
- Verdict pill (small variant)
- External link icon → `item.url`

No streaming, no deeper dive.

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| URL fetch fails in API | Fall back to URL-only; append "(Content could not be retrieved.)" |
| Groq stream fails (SSE error frame) | `useStreaming` calls `setError`; streaming card shows error + retry |
| Groq request fails before stream starts | `response.ok` check throws; same error state |
| Invalid URL submitted on `/drop` | `new URL(value)` throws; show inline error, no request |
| localStorage unavailable | Wrap all reads/writes in try/catch; no-op silently |
| Strict Mode double-invoke | `hasTriggered` ref prevents duplicate auto-trigger |

---

## Out of Scope

- Editing or deleting individual history items
- Pagination of history (capped at 50 most recent)
- Sharing assessments
- Real deduplication (same URL assessed twice creates two entries)
