# Ask Drift — Phase 5 Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Phase 5 adds the `/ask` screen — a free-text interface where users ask Drift whether a tool or skill is worth adopting. Drift responds with a structured YES / NOT YET / SKIP verdict personalised to the user's stack and current context, followed by a full back-and-forth conversation thread. Past verdicts are stored locally and browsable in a History tab.

---

## Page Structure

**Route:** `/ask` (under the existing `(app)` layout — profile guard and bottom nav apply)

Two tabs managed by local React state:

| Tab | Content |
|-----|---------|
| Ask | Input bar + active verdict + conversation thread |
| History | Collapsible list of past verdicts, read-only |

---

## Ask Tab

### Input Bar
- Always visible at the top of the tab, regardless of whether a conversation is active.
- Placeholder: *"Ask about a tool or skill..."*
- Submit on Enter or clicking the Ask button (appears when input is non-empty).
- When a new query is submitted while a completed verdict exists in state: save the current verdict + conversation to history first, then reset state and start fresh.

### Streaming State
- While the API response streams, a `StreamingCard` is shown (spinner + live streamed text + pulsing cursor) — same pattern as the Drop page.
- On error, show retry button within the card.

### VerdictCard
Replaces `StreamingCard` once streaming completes. Contains:

| Section | Content |
|---------|---------|
| Top accent line | Color-coded: green (YES), amber (NOT YET), muted (SKIP) |
| Verdict pill | YES / NOT YET / SKIP — bold, color-matched |
| Confidence badge | "High confidence" or "Medium confidence" |
| For you | 1–2 sentence personalised rationale |
| Case for | Green-tinted panel |
| Case against | Muted panel |
| Alternative | Optional — shown only when `alternative` field is present in response |

### Conversation Thread
- Sits directly below `VerdictCard`, visible after the first verdict is received.
- Bubble layout: user messages right-aligned (accent-tinted), Drift replies left-aligned with small `∿` avatar.
- Follow-up input at bottom of thread (placeholder: *"Follow up..."*), submit on Enter or send icon.
- Each follow-up POSTs to `/api/verdict` with the full accumulated `messages` array.
- Drift reply appended to the thread on stream completion.

---

## History Tab

- Reads from and writes to `localStorage` key `drift_ask_history` (max 50 items, trimmed on save).
- Each entry is a `StoredVerdict` (see Types section).
- **Collapsed state:** verdict pill + truncated query text + expand chevron + trash icon.
- **Expanded state:** full verdict card breakdown (same sections as VerdictCard) + message count + date + trash icon.
- Trash icon always visible (collapsed and expanded). On click: remove from localStorage and local state with `AnimatePresence` exit animation.
- Empty state when no history: *"No verdicts yet. Ask Drift something."*

---

## Verdict Color Coding

| Verdict | Top line | Pill bg | Pill text/border |
|---------|----------|---------|-----------------|
| YES | `drift-accent/70 → drift-accent/20` | `drift-accent/12` | `drift-accent`, `drift-accent/30` |
| NOT_YET | `amber-400/70 → amber-400/20` | `amber-400/10` | `amber-400`, `amber-400/25` |
| SKIP | `white/20 → white/5` | `white/[0.05]` | `white/40`, `white/[0.10]` |

---

## Types

Add `StoredVerdict` to `src/types/verdict.ts`:

```ts
export interface StoredVerdict extends Verdict {
  messages: { role: 'user' | 'assistant'; content: string }[]
  askedAt: string // ISO date string, set client-side at persist time
}
```

The existing `Verdict` interface already has all required verdict fields (`verdict`, `confidence`, `for_you`, `case_for`, `case_against`, `alternative?`, `query`, `createdAt`).

---

## API

Reuse the existing `/api/verdict` route — no new route needed.

**Request shape:**
```ts
{
  profile: DriftProfile
  query: string
  messages?: { role: 'user' | 'assistant'; content: string }[]
}
```

The route already handles conversation threading via the optional `messages` array.

---

## Streaming Hook Fix

`useStreaming` currently calls `onDone(parsed.assessment)` but the verdict route sends `{ done: true, verdict }`. Update line 51 of `src/hooks/use-streaming.ts`:

```ts
// Before
if (parsed.done && parsed.assessment) {
  options?.onDone?.(parsed.assessment)

// After
if (parsed.done && (parsed.assessment ?? parsed.verdict)) {
  options?.onDone?.(parsed.assessment ?? parsed.verdict)
```

This is backwards-compatible — the Drop page (`parsed.assessment`) is unaffected.

---

## File Plan

| File | Action |
|------|--------|
| `src/app/(app)/ask/page.tsx` | Create — full page with all components as local functions |
| `src/types/verdict.ts` | Update — add `StoredVerdict` |
| `src/hooks/use-streaming.ts` | Update — fix `onDone` to handle `parsed.verdict` |

All components (`StreamingCard`, `VerdictCard`, `ConversationThread`, `AskTab`, `HistoryTab`) live as local functions inside `ask/page.tsx`, consistent with the Drop page pattern.

---

## localStorage Schema

```ts
// Key: 'drift_ask_history'
// Value: StoredVerdict[] (max 50, newest first)
```

---

## Out of Scope (for now)

- Resuming a past conversation (history is read-only)
- Sharing or exporting verdicts
- Filtering history by verdict type
