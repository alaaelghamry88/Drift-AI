# Drift — Implementation Plan

---

## Phase 1 — Project Setup
- [x] Scaffold Next.js app with TypeScript
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui
- [x] Install Framer Motion
- [x] Set up fonts (Sora, Plus Jakarta Sans, JetBrains Mono)
- [x] Apply design system — CSS variables, Tailwind config, globals.css
- [x] Set up Anthropic API client (`/lib/claude.ts`)
- [x] Set up project folder structure per design system spec

---

## Phase 2 — Onboarding Flow
- [x] Step 1 — Role & stack selection screen
- [x] Step 2 — "What are you building?" context input screen
- [x] Step 3 — AI Workflow Profiler (5 questions)
- [x] Profile generation moment (animated transition)
- [x] Save profile to localStorage
- [x] Redirect to Home on completion

---

## Phase 3 — Daily Digest
- [x] Home screen layout and shell
- [x] Connect Claude API with web search tool to generate digest items
- [x] Build base `DriftCard` component
- [x] Build card variants — tool release, article, video, repo
- [x] Relevance score badge component
- [x] Card actions — save, skip, go deeper
- [x] "Go deeper" inline expansion with streaming
- [x] Staggered card entry animation
- [x] Done state screen

---

## Phase 4 — Drop (Link Library)
- [x] Drop page layout and URL input (`/drop`)
- [x] `POST /api/links` — metadata extraction (title, summary, type, thumbnail, favicon)
- [x] Link type detection — video, article, repo, tweet, other
- [x] localStorage CRUD — add, update status, remove, archive expired
- [x] Context bar — display and inline edit of current work context
- [x] `POST /api/links/score` — batch relevance scoring against context (0–10)
- [x] Relevance sections — "Relevant to you now" (6+) vs "Other saved"
- [x] Type filter chips
- [x] Link card — Read / Keep / Remove actions with status styling
- [x] Auto-archival on page load + 24-hour expiry warning nudge
- [x] Save sheet (FAB) for quick capture from other screens

---

## Phase 5 — Ask Drift
- [x] Ask Drift screen layout (`/ask`)
- [x] Free text input for tool or skill query
- [x] Claude prompt — verdict with web search for currency
- [x] Streaming `VerdictCard` component — YES / NOT YET / SKIP
- [x] Follow-up conversation thread
- [x] Previous verdicts history list

---

## Phase 6 — Profile Screen
- [x] Profile screen layout (`/profile`)
- [x] Display Drift Profile — stack tags, role, current context
- [x] Edit context inline
- [x] AI Workflow Assessment card — 3 recommendations
- [x] Effort badges — Quick Win / Medium Lift / Long Term
- [x] Re-run profiler option

---

## Phase 7 — Polish
- [x] Page transitions (Framer Motion `pageFade`)
- [x] Background atmosphere — slow gradient animation + noise texture
- [x] Mobile responsive layout + bottom navigation
- [x] Loading and skeleton states for all async content
- [x] Error states — failed fetch, API timeout
- [x] Empty states — first visit before digest generates
- [x] Final QA across all screens

---

## Build Order Summary

```
Phase 1 → Setup
Phase 2 → Onboarding
Phase 3 → Daily Digest      ← Most important screen
Phase 4 → Drop (Link Library)
Phase 5 → Ask Drift
Phase 6 → Profile
Phase 7 → Polish
```

**Start with Phase 3 after setup** — the digest is the heart of the product and the best screen to showcase in your portfolio.

---

*Drift Implementation Plan v1.0*
