# Drift — Implementation Plan

---

## Phase 1 — Project Setup
- [ ] Scaffold Next.js app with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Install Framer Motion
- [ ] Set up fonts (Sora, Plus Jakarta Sans, JetBrains Mono)
- [ ] Apply design system — CSS variables, Tailwind config, globals.css
- [ ] Set up Anthropic API client (`/lib/claude.ts`)
- [ ] Set up project folder structure per design system spec

---

## Phase 2 — Onboarding Flow
- [ ] Step 1 — Role & stack selection screen
- [ ] Step 2 — "What are you building?" context input screen
- [ ] Step 3 — AI Workflow Profiler (5 questions)
- [ ] Profile generation moment (animated transition)
- [ ] Save profile to localStorage
- [ ] Redirect to Home on completion

---

## Phase 3 — Daily Digest
- [ ] Home screen layout and shell
- [ ] Connect Claude API with web search tool to generate digest items
- [ ] Build base `DriftCard` component
- [ ] Build card variants — tool release, article, video, repo
- [ ] Relevance score badge component
- [ ] Card actions — save, skip, go deeper
- [ ] "Go deeper" inline expansion with streaming
- [ ] Staggered card entry animation
- [ ] Done state screen

---

## Phase 4 — Link Drop
- [ ] Persistent link drop input on home screen
- [ ] Full link drop page (`/drop`)
- [ ] Claude web fetch — read and analyze the URL
- [ ] Streaming assessment output
- [ ] Verdict display — worth it / save for later / skip
- [ ] Slot "save for later" links into next digest

---

## Phase 5 — Ask Drift
- [ ] Ask Drift screen layout (`/ask`)
- [ ] Free text input for tool or skill query
- [ ] Claude prompt — verdict with web search for currency
- [ ] Streaming `VerdictCard` component — YES / NOT YET / SKIP
- [ ] Follow-up conversation thread
- [ ] Previous verdicts history list

---

## Phase 6 — Profile Screen
- [ ] Profile screen layout (`/profile`)
- [ ] Display Drift Profile — stack tags, role, current context
- [ ] Edit context inline
- [ ] AI Workflow Assessment card — 3 recommendations
- [ ] Effort badges — Quick Win / Medium Lift / Long Term
- [ ] Re-run profiler option

---

## Phase 7 — Polish
- [ ] Page transitions (Framer Motion `pageFade`)
- [ ] Background atmosphere — slow gradient animation + noise texture
- [ ] Mobile responsive layout + bottom navigation
- [ ] Loading and skeleton states for all async content
- [ ] Error states — failed fetch, API timeout
- [ ] Empty states — first visit before digest generates
- [ ] Final QA across all screens

---

## Build Order Summary

```
Phase 1 → Setup
Phase 2 → Onboarding
Phase 3 → Daily Digest      ← Most important screen
Phase 4 → Link Drop
Phase 5 → Ask Drift
Phase 6 → Profile
Phase 7 → Polish
```

**Start with Phase 3 after setup** — the digest is the heart of the product and the best screen to showcase in your portfolio.

---

*Drift Implementation Plan v1.0*
