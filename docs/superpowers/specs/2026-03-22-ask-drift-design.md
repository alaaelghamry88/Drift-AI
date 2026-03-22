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
- The input is **disabled while streaming is in progress** (same as the Drop page pattern).
- When a new query is submitted while a completed verdict exists in state: save the current verdict + conversation to history first, then reset state and start fresh.

### Streaming State
- While the API response streams, a `StreamingCard` is shown (spinner + live streamed text + pulsing cursor) — same pattern as the Drop page.
- On error (`streamError` set), show retry button within the card.
- If streaming completes but `onDone` was never called (silent JSON parse failure in the route), treat this as an error and show the retry button. Detect this with a local `verdictReceived` ref: set it to `true` inside `onDone`. After `await stream(...)` resolves, if `verdictReceived.current` is still `false`, set a local error state (`'Could not parse verdict. Try again.'`).

### VerdictCard
Replaces `StreamingCard` once streaming completes. Contains:

| Section | Content |
|---------|---------|
| Top accent line | Color-coded: green (YES), amber (NOT YET), muted (SKIP) |
| Verdict pill | Display text: `YES` / `NOT YET` / `SKIP` (note: `NOT_YET` type renders as `NOT YET` with a space) |
| Confidence badge | "High confidence" or "Medium confidence" |
| For you | 1–2 sentence personalised rationale |
| Case for | Green-tinted panel |
| Case against | Muted panel |
| Alternative | Optional — shown only when `alternative` field is present in response |

### Conversation Thread
- Sits directly below `VerdictCard`, visible after the first verdict is received.
- Bubble layout: user messages right-aligned (accent-tinted), Drift replies left-aligned with small `∿` avatar.
- Follow-up input at bottom of thread (placeholder: *"Follow up..."*), submit on Enter or send icon.
- The input is **disabled while streaming is in progress** — submit is not possible until the current response completes.
- Each follow-up POSTs to `/api/verdict` with `query` set to the **original question** (unused by the route when `messages` is present, but required by the type) and the full accumulated `messages` array.
- The `messages` array at the point of a follow-up must contain the complete prior exchange, starting with `{ role: 'user', content: originalQuery }` as the first entry, followed by all assistant and user turns in order.
- Append the **raw streamed text** (the string returned by `stream()`, not the parsed JSON object) as the `assistant` role message when building the thread. The `stream()` return value is the safe way to capture this — do not use the `text` state from the hook (it resets on the next call). This gives the LLM readable natural-language context on follow-ups rather than a JSON blob.
- Drift reply appended to the thread on stream completion.

---

## History Tab

- Reads from and writes to `localStorage` key `drift_ask_history` (max 50 items, trimmed on save).
- Each entry is a `StoredVerdict` (see Types section).
- **Collapsed state:** verdict pill + truncated query text + expand chevron + trash icon.
- **Expanded state:** full verdict card breakdown (same sections as VerdictCard) + message count + date + trash icon.
- Trash icon always visible (collapsed and expanded). On click: remove from localStorage and local state with `AnimatePresence` exit animation. Use `item.id` as both the React list key and the deletion identifier.
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
  // inherits createdAt from Verdict — used as the display date in History tab
}
```

The existing `Verdict` interface has `verdict`, `confidence`, `for_you`, `case_for`, `case_against`, `alternative?`, `query`, `id`, and `createdAt`. The LLM prompt (`verdictSystemPrompt`) only returns `verdict`, `confidence`, `for_you`, `case_for`, `case_against`, and `alternative` — it does **not** return `id`, `query`, or `createdAt`. All three must be injected client-side on receipt:

```ts
const stored: StoredVerdict = {
  ...verdictFromApi,
  id: crypto.randomUUID(),
  query: originalQuery,
  createdAt: new Date().toISOString(),
  messages: accumulatedMessages,
}
```

`createdAt` is the timestamp displayed in the History tab's "date" field. No separate `askedAt` field is needed.

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
  continue  // keep this
}

// After
if (parsed.done && (parsed.assessment ?? parsed.verdict)) {
  options?.onDone?.(parsed.assessment ?? parsed.verdict)
  continue  // keep this
}
```

The `continue` must be preserved — it prevents the chunk from also being processed as text. This is backwards-compatible — the Drop page (`parsed.assessment`) is unaffected.

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

All `localStorage` reads and writes are wrapped in `try/catch` and silently swallow errors (storage unavailable, quota exceeded, parse failure) — same pattern as the Drop page. On parse failure, return an empty array.

---

## Out of Scope (for now)

- Resuming a past conversation (history is read-only)
- Sharing or exporting verdicts
- Filtering history by verdict type
