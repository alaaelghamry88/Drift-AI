# Phase 4 — Link Drop: Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Phase 4 adds a Link Drop feature to Drift. Users paste any URL into an input; the app fetches the page content server-side, then streams a Groq-powered assessment verdict. All past assessments are persisted to localStorage and shown as cards on the `/drop` page, making it a running history of everything the user has evaluated.

---

## Goals

- Give users a fast way to assess whether any URL is worth their time, in context of their Drift profile
- Persist all past assessments so the drop page doubles as a history feed
- Slot "save for later" links into the DigestScreen as a lightweight saved links section

---

## Files Changed

### New
- `src/app/(app)/drop/page.tsx` — full drop page with input + history list

### Modified
- `src/app/api/link-drop/route.ts` — add server-side URL fetch before streaming
- `src/components/digest/digest-screen.tsx` — render `LinkDropInput` above the card feed
- `src/hooks/use-streaming.ts` — add optional `onDone` callback for final parsed JSON

---

## Data

### `LinkAssessment` type (already defined in `src/types/verdict.ts`)

```ts
interface LinkAssessment {
  url: string
  content_type: 'video' | 'article' | 'repo' | 'post' | 'other'
  title: string
  summary: string
  relevance_score: number
  verdict: 'worth_your_time' | 'save_for_later' | 'skip'
  verdict_reason: string
  save_to_digest: boolean
}
```

### localStorage keys

- `drift_drop_history` — `LinkAssessment[]`, newest first. Each completed assessment is prepended.

---

## API — `/api/link-drop`

**Change:** Before calling Groq, fetch the submitted URL server-side.

1. `fetch(url, { signal: AbortSignal.timeout(5000) })` — 5s timeout
2. Read response as text, strip HTML tags with regex, collapse whitespace, trim to 3000 chars
3. Append to user message: `\n\nCONTENT:\n<extracted text>`
4. On fetch failure (timeout, network error, non-200): fall back to URL-only assessment with no content appended

The SSE protocol is unchanged: partial `{ text, partial: true }` chunks, then `{ done: true, assessment: LinkAssessment }`, then `[DONE]`.

---

## Hook — `useStreaming`

Add an optional `onDone?: (data: unknown) => void` parameter to the `stream()` call.

When `{ done: true, assessment }` is parsed from the SSE stream, call `onDone(assessment)` if provided. Existing callers (`deeper` expansion) pass no `onDone` and are unaffected.

---

## Home Screen

Add `<LinkDropInput profile={profile} />` to `DigestScreen`, rendered between the header divider and the card list. It sits there persistently regardless of digest state (loading, loaded, done).

`LinkDropInput` already navigates to `/drop?url=<encoded>` on submit — no change needed to the component.

---

## `/drop` Page

### URL param handling
On mount, read `?url=` search param. If present: auto-fill the input and immediately trigger assessment.

### Layout
```
[Input bar — always visible at top]
─────────────────────────────────
[Streaming card — while assessing]   ← only when active
[VerdictCard 1 — most recent]
[VerdictCard 2]
[VerdictCard 3]
...
[Empty state — "No links dropped yet" if history is empty]
```

### Input bar
Same visual style as `LinkDropInput` on home. Accepts a URL, shows "Assess" button when non-empty. Disabled while an assessment is in progress.

### Streaming card (in-progress state)
A `DriftCard` at position 0 with a pulsing "Analyzing..." header and the raw streamed text rendering below it as it arrives. Uses the same streaming text cursor pattern as the "go deeper" expansion.

### VerdictCard
Rendered for each completed `LinkAssessment` in history.

- **Header row:** content type badge + `RelevanceScore` component
- **URL subtitle:** truncated URL in `text-drift-text-tertiary`
- **Title** (`text-h2`)
- **Summary** (`text-body`)
- **Verdict pill** — full-width, color-coded:
  - `worth_your_time` → `drift-accent` green
  - `save_for_later` → amber (`text-amber-400 bg-amber-400/10 border-amber-400/25`)
  - `skip` → muted (`text-white/40 bg-white/[0.04]`)
- **Verdict reason** (`text-body-sm text-drift-text-secondary`)
- **Action row:**
  - "Save to digest" button — shown if `save_to_digest === true` or `verdict === 'worth_your_time'`; toggles a saved state stored back into the history item
  - "Open" button — `<a>` to the URL, `target="_blank"`

### Empty state
When `drift_drop_history` is empty and no assessment is in progress:
> "No links dropped yet. Paste any URL above to assess it."

---

## DigestScreen — Saved Links Section

If `drift_drop_history` contains any items where `save_to_digest === true`, render a compact "Saved Links" section above the AI-generated cards.

Each saved link renders as a compact row:
- Content type icon + title
- Verdict pill (small)
- "Open" external link icon

No streaming, no deeper dive — just a lightweight list. Section is collapsible (chevron toggle).

---

## Error Handling

- **URL fetch fails in API:** fall back to URL-only assessment, add `"(content unavailable)"` note to user message
- **Groq stream fails:** show error state on the streaming card with a "Try again" button
- **Invalid URL submitted:** client-side validation — show inline error, don't submit
- **localStorage unavailable:** catch and no-op; history just won't persist

---

## Out of Scope

- Editing or deleting individual history items
- Pagination of history
- Sharing assessments
- Real deduplication (same URL assessed twice creates two entries)
