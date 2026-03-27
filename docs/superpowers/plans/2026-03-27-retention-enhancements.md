# Retention Enhancements — Daily-Use Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Drift a tool people return to daily — not just when they remember it exists. Five independent problems identified from product review, each tackled separately.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide icons

---

## Problem 1 — Feed Feels Static

**Issue:** The digest is a passive list. Nothing pulls you back, nothing feels interactive or alive.

Four sub-features to implement independently:

---

### 1a. "Today's One Thing" Hero Card

**What:** After cards load, the card with the highest `relevance_score` is pinned at the top as a visually distinct hero card — larger, with a glowing accent border. It has a "On it" button that marks it as read and collapses it to normal size with animation.

**Tasks:**
- [x] In `DigestScreen`, after `cards` are set, derive `heroCard` = the card with max `relevance_score` (only when `cards.length > 0`)
- [x] Create `src/components/digest/hero-card.tsx` — same data as `DigestCardItem` but with larger title (`text-h1`), a `◈ Today's focus` label at the top, a stronger `drift-accent` border glow, and an "On it →" button that calls `onAction(id, 'read')`
- [x] Render `<HeroCard>` above the cards list, excluded from the `cards.map()` loop
- [x] Animate it in with `initial={{ opacity: 0, scale: 0.97 }}` and a slight delay before the rest of the cards

**Files:**
- `src/components/digest/hero-card.tsx` — new component
- `src/components/digest/digest-screen.tsx` — derive `heroCard`, render it, exclude from main list

---

### 1b. Swipe-to-Triage

**What:** Each digest card is horizontally draggable. Drag right → Save (green glow appears). Drag left → Mark as read (card fades out leftward). Directional hint labels fade in as you drag so the affordance is learnable.

**Tasks:**
- [x] Wrap the `motion.div` in `DigestCardItem` with `drag="x"` and `dragConstraints={{ left: -120, right: 120 }}`
- [x] Use `useMotionValue` + `useTransform` to map drag x to: background tint (green right, blue left), opacity of hint labels ("Save →" / "← Done")
- [x] On `onDragEnd`: if `offset.x > 80` call `onAction(id, 'save')`; if `offset.x < -80` call `onAction(id, 'read')`; otherwise spring back to 0
- [x] Show hint labels as absolutely-positioned overlays on the card that appear at ~30px drag threshold
- [x] Disable drag when card is already actioned (`isSaved || isRead`)

**Files:**
- `src/components/digest/digest-screen.tsx` — swipe logic inside `DigestCardItem`

---

### 1c. Context Pulse — Feed Re-ranks on Context Change

**What:** When `profile.currentContext` changes (user updates it), the feed visibly re-fetches and cards animate out then back in with new ordering. A brief "Re-ranking for your context..." label shows during the transition. Makes the context→relevance connection tangible.

**Tasks:**
- [x] In `DigestScreen`, track a `prevContext` ref initialised to `profile.currentContext`
- [x] In a `useEffect` watching `profile.currentContext`: if it differs from `prevContext.current` and `cards.length > 0`, show a `isReranking` state with the label, then call `fetchDigest()` after a 400ms delay (enough for exit animations to start)
- [x] During `isReranking`, animate existing cards out with `exit={{ opacity: 0, y: -8 }}` before the skeleton appears
- [x] Update `prevContext.current` after re-fetch completes

**Files:**
- `src/components/digest/digest-screen.tsx` — context change watcher + `isReranking` state

---

### 1d. "What Shifted Since Yesterday"

**What:** A short single-sentence banner at the top of the feed that describes what's new compared to yesterday's digest. Generated client-side by comparing card titles — no extra API call needed. E.g. *"3 new items today — Claude 4 and Vercel AI SDK dominate."*

**Tasks:**
- [x] Move the digest cache from `sessionStorage` to `localStorage` with a date-keyed structure: `{ date: "2026-03-27", cards: [...] }`
- [x] On load, read yesterday's cache (date key = yesterday's ISO date string)
- [x] After new cards load, compute: `newCount` = cards whose titles don't appear in yesterday's list
- [x] If `newCount > 0` and yesterday's cache exists, derive a summary string: *"X new items today"* + the top 1–2 new titles joined with "and"
- [x] Render as a subtle `◈` prefixed line in `text-label text-drift-text-tertiary` below the header divider, animated in with `opacity: 0 → 1`
- [x] If it's the user's first ever load (no yesterday cache), skip the banner

**Files:**
- `src/components/digest/digest-screen.tsx` — cache migration + shift banner
- Cache key: `drift_digest_v2` (new key to avoid collision with old `drift_digest_cache`)

---

## Problem 2 — Drop Requires Too Much Friction to Save

**Issue:** "Paste a URL" is too many steps when mid-browsing. Without a share-target or extension, the tool loses links to competing habits.

**Solution:**
- Add PWA `share_target` manifest entry so mobile users can share URLs directly from any browser/app into Drift
- Add a `/share` route that receives the shared URL and redirects to Drop with the URL pre-filled

**Tasks:**
- [x] Update `public/manifest.json` to add `share_target` with `action: "/share"`, `method: "GET"`, `params: { url: "url" }`
- [x] Create `src/app/share/page.tsx` — reads `?url=` param, saves the link via the same `handleSave` flow, then redirects to `/drop`
- [ ] Verify the app is installable as a PWA (check `next-pwa` or equivalent is configured)

**Files:**
- `public/manifest.json`
- `src/app/share/page.tsx` — new route

---

## Problem 4 — Current Context Is Buried and Goes Stale Silently

**Issue:** The "Currently Building" context field drives everything (scoring, verdicts, digest) but it lives in the profile and at the top of Drop. When it's stale, the whole product degrades silently with no signal.

**Solution:**
Replace the static `profile.role · stack` subtitle line in the Feed header with the current context. Make it tappable — tap opens an inline edit field right there. No new chrome. Combined with a 7-day stale nudge that turns the line amber.

**Tasks:**
- [ ] In `DigestScreen`, replace the `profile.role · stack` subtitle with `profile.currentContext` (truncated to ~60 chars)
- [ ] Add a `Pencil` icon (12px, tertiary colour) inline after the text
- [ ] Track `isEditingContext` boolean state in `DigestScreen`
- [ ] When tapped, swap the text line for an inline `<input>` pre-filled with `profile.currentContext`, same style as `ContextBar`
- [ ] On Enter or blur: call `updateProfile({ currentContext: value })` from `useProfile`, then set `isEditingContext` to false
- [ ] After save, trigger a re-fetch of the digest (same as context pulse in 1c) since the context just changed
- [ ] In `useProfile`, expose `contextUpdatedAt` (store alongside profile in localStorage, default to `profile.createdAt`)
- [ ] If `Date.now() - contextUpdatedAt > 7 days`, render the context line in `text-amber-400` with label *"Update your focus →"* instead of the context text

**Files:**
- `src/components/digest/digest-screen.tsx` — tappable context line replacing role/stack subtitle
- `src/hooks/use-profile.ts` — `updateProfile()` helper + `contextUpdatedAt` field

---

## Problem 5 — No Sense of Progress or Momentum

**Issue:** There's no feedback loop. People can't see they're getting value, so the habit doesn't form.

**Solution:**
- Add a lightweight weekly stats strip to the Profile page: links triaged, verdicts made, links kept
- Show a small streak counter (days with at least one action) in the Me tab

**Tasks:**
- [ ] Create `src/lib/activity-log.ts` — append-only log of actions (`link_saved`, `link_read`, `link_kept`, `verdict_made`) stored in localStorage with ISO timestamps
- [ ] Instrument Drop (`handleStatus`, `handleSave`) and Ask (on verdict received) to write activity log entries
- [ ] On the Profile/Me page, compute and display: links saved this week, links triaged (read/kept/removed), verdicts made
- [ ] Compute current streak (consecutive days with ≥1 logged action) and show next to the profile avatar/header
- [ ] Cap the log at 90 days of entries to avoid localStorage bloat

**Files:**
- `src/lib/activity-log.ts` — new
- `src/app/(app)/drop/page.tsx` — instrument actions
- `src/app/(app)/ask/page.tsx` — instrument verdict
- `src/app/(app)/me/page.tsx` (or equivalent) — stats strip + streak display
