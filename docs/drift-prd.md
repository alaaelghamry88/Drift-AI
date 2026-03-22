# Drift — Product Requirements Document
**Version:** 1.0 — MVP
**Status:** Draft
**Last Updated:** March 2026

---

## 1. Product Overview

### 1.1 Vision
Drift is the calm, intelligent companion for developers navigating the AI era. It filters the noise, understands your context, and tells you exactly what matters, what to learn, and how to work smarter — every single day.

### 1.2 Problem Statement
Developers in 2025 face a compounding set of pressures driven by the speed of AI adoption:

- **Information overload** — New tools, frameworks, releases, and articles emerge daily. Traditional feeds and newsletters are too noisy and too generic to be useful.
- **Accumulation anxiety** — Apps designed to help end up creating new backlogs. Unread items pile up and become a source of stress rather than value.
- **Strategic confusion** — Developers don't know which AI tools fit their workflow, which skills to prioritize, or whether they're falling behind.
- **Context blindness** — No existing tool knows what a developer is actively building right now and uses that as a filter for what's relevant.

### 1.3 Solution
Drift is a personalized AI intelligence layer that:
- Delivers a daily digest of maximum 5–7 items — ruthlessly curated to the developer's stack, role, and current context
- Processes any dropped link (YouTube, LinkedIn, articles, GitHub) and scores its relevance instantly
- Uses a persistent "what are you building?" context to filter everything through the lens of the user's current work
- Profiles the user's AI workflow and delivers specific, actionable recommendations — not a list of 50 tools
- Answers the question "should I learn this?" with a direct, honest verdict tailored to the user's profile

### 1.4 Target User
**Primary:** Mid-to-senior developers actively building with or exploring AI tooling, working independently or in small teams, who feel the pressure of the fast-moving AI landscape.

**Secondary:** Technical leads and engineering managers who want to stay strategically informed without spending hours reading.

---

## 2. Goals & Success Metrics

### 2.1 Product Goals
- Make developers feel **calm and in control** of the AI landscape
- Deliver **genuine signal** — not just aggregated noise
- Create a **daily habit** through consistent value and a satisfying done state
- Showcase **generative UI** as a core product differentiator — not a gimmick

### 2.2 MVP Success Metrics

| Metric | Target |
|---|---|
| Daily digest completion rate | > 60% of users review all 5–7 cards |
| Link drop usage | > 40% of users drop at least 1 link per week |
| "Should I learn this?" queries | > 3 queries per user per week |
| Session satisfaction | Users describe the experience as "calm" or "focused" |
| Recruiter/demo impression | Product story communicated within 2 minutes of opening |

---

## 3. User Personas

### 3.1 Alex — The Curious Builder
- **Role:** Full-stack developer, 3–5 years experience
- **Stack:** Next.js, TypeScript, exploring AI integrations
- **Pain:** Follows 20 newsletters and still feels behind. Saves links he never reads.
- **Goal:** Know what actually matters for his stack without spending an hour every morning

### 3.2 Sara — The Pragmatic Lead
- **Role:** Engineering lead at a small startup
- **Stack:** Python backend, building internal AI tooling
- **Pain:** Needs to make decisions about AI tooling for her team but has no time to research
- **Goal:** Get clear, opinionated guidance on what to adopt and what to skip

---

## 4. Features & Requirements

### 4.1 Feature 1 — Onboarding & Drift Profile

**Description:**
A 3-step onboarding flow that collects the user's stack, role, current project context, and baseline AI workflow habits. This generates a **Drift Profile** — the intelligence layer that powers all personalization.

**User Stories:**
- As a new user, I want to tell Drift my stack and role so that my digest is relevant to me
- As a new user, I want to describe what I'm currently building so that content is filtered through my active context
- As a new user, I want to answer a short workflow assessment so that Drift understands how I currently use AI

**Requirements:**
- Step 1: Role selection + tech stack (multi-select with search)
- Step 2: "What are you currently building?" — free text input, plain English
- Step 3: AI Workflow Profiler — 5 focused questions assessing current AI tool usage and habits
- Profile generation moment — animated, feels like something is being created for you
- Profile is editable at any time from the profile screen
- Onboarding completion triggers first digest generation

**Acceptance Criteria:**
- [ ] User can complete onboarding in under 3 minutes
- [ ] Profile data is used visibly in digest relevance scoring
- [ ] Context can be updated from any screen via a persistent input

---

### 4.2 Feature 2 — Daily Digest

**Description:**
The core screen of Drift. A daily feed of maximum 5–7 AI-curated items, each rendered as a dynamically generated card based on content type. The feed ends in a clear "done" state.

**User Stories:**
- As a user, I want to open Drift each morning and see only what matters to me today
- As a user, I want each item to tell me why it's relevant to my stack and current context
- As a user, I want to reach a satisfying "done" state when I've reviewed everything
- As a user, I don't want unreviewed items to pile up and create anxiety

**Content Sources:**
- AI/dev news aggregation via Claude web search tool
- GitHub release feeds for user's relevant tools
- Curated dev content (articles, videos, posts)
- User-dropped links scheduled for surfacing

**Card Types (Generative UI):**
Each content type renders a distinct card layout:

| Content Type | Card Behavior |
|---|---|
| Tool release | Version diff highlight, what changed, impact score |
| Article / post | TL;DR, key takeaway, read time estimate |
| YouTube video | Topic summary, key timestamps, worth watching verdict |
| GitHub repo | What it does, use case match, star momentum |
| Skill / concept | What it is, why now, your relevance score |

**Requirements:**
- Maximum 7 items per day — AI selects, user never sees what was filtered
- Each card displays: summary, relevance score (1–10), reason for relevance, action options (Save / Skip / Go Deeper)
- "Go Deeper" triggers Claude to expand the item inline with more detail
- End-of-digest "You're all caught up" state with a one-line summary of the day
- If user misses a day — no catch-up pile. A single synthesis paragraph replaces missed days
- Digest refreshes at a set daily time (configurable)

**Acceptance Criteria:**
- [ ] Digest renders with correct card types per content
- [ ] Relevance score reflects user stack and current context
- [ ] Done state is reached and feels intentional and satisfying
- [ ] Missed days show synthesis, not a backlog

---

### 4.3 Feature 3 — Link Drop

**Description:**
A persistent input accessible from any screen. The user pastes any URL — YouTube video, LinkedIn post, article, GitHub repo, tweet — and Drift processes it in real time, returning a structured assessment.

**User Stories:**
- As a user, I want to drop a link I found and immediately know if it's worth my time
- As a user, I want dropped links that are relevant to be surfaced in a future digest automatically
- As a user, I want to know why a link is or isn't relevant to my current work

**Requirements:**
- Persistent URL input accessible from home screen and as a floating action
- On submission, Claude fetches and reads the content (web fetch + analysis)
- Streamed response — user sees the assessment being generated in real time
- Assessment output includes:
  - Content type detection (video / article / repo / post)
  - 2–3 sentence summary
  - Relevance score tied to user profile and current context
  - Verdict: **Worth your time / Save for later / Skip** — with a one-line reason
  - If "Save for later" — automatically slotted into a future digest
- Processing animation while Claude reads the content

**Acceptance Criteria:**
- [ ] Supports YouTube, LinkedIn, GitHub, and standard article URLs
- [ ] Assessment streams visibly to the user
- [ ] Relevant links are surfaced in digest within 24–48 hours
- [ ] Verdict is opinionated and specific, not generic

---

### 4.4 Feature 4 — AI Workflow Profiler

**Description:**
A smart assessment that maps the user's current AI workflow, identifies gaps and underused opportunities, and delivers 2–3 specific, actionable recommendations tailored to their role, stack, and current project.

**User Stories:**
- As a user, I want to understand how well I'm currently using AI in my workflow
- As a user, I want specific recommendations — not a list of 50 tools
- As a user, I want recommendations that make sense for what I'm actually building

**Profiler Questions (MVP set):**
1. How are you currently using AI in your coding workflow? (multi-select)
2. What does your current AI toolset look like? (multi-select + free text)
3. What's your biggest time sink in your current project?
4. Have you explored AI agents or automated workflows? (scale: not at all → heavily)
5. What's your biggest hesitation with adopting more AI tooling?

**Requirements:**
- Profiler runs during onboarding and is re-accessible from the profile screen
- Claude analyzes responses against current landscape of tools and practices
- Output is a **Workflow Assessment Card** containing:
  - A 2-sentence summary of the user's current AI maturity
  - 3 specific, ranked recommendations with tool names, use cases, and effort estimates
  - One "quick win" — something they can try today
- Recommendations update as the user's context changes or new tools emerge
- No scores, no grades — the tone is advisory, not judgmental

**Acceptance Criteria:**
- [ ] Assessment completes in under 60 seconds
- [ ] Recommendations are specific (named tools, concrete actions) not generic
- [ ] Output feels like advice from a senior peer, not a marketing list
- [ ] Profiler can be re-run and recommendations evolve over time

---

### 4.5 Feature 5 — "Should I Learn This?"

**Description:**
A conversational, always-accessible verdict engine. The user names any tool, framework, skill, or concept trending in the AI/dev space, and Drift returns a direct, structured verdict tailored to their profile.

**User Stories:**
- As a user, I want a fast, honest answer on whether a trending tool is worth my time
- As a user, I want that answer to be based on my stack and what I'm building — not generic advice
- As a user, I don't want a balanced "it depends" — I want a real opinion

**Verdict Structure:**
```
Verdict:     YES / NOT YET / SKIP
Confidence:  High / Medium
For you:     [1–2 sentences specific to user's stack and context]
The case for: [1–2 sentences on why someone would adopt this]
The case against: [1–2 sentences on why someone would skip it]
Better alternative: [if applicable]
```

**Requirements:**
- Accessible as a dedicated screen ("Ask Drift") and as a quick-access input
- Input is free text — user types naturally ("should I learn LangGraph?" or "is MCP worth it?")
- Claude uses web search to verify current state of the tool before responding
- Response streams in real time
- User can follow up with questions in the same thread
- Previous verdicts are saved and accessible in history

**Acceptance Criteria:**
- [ ] Verdict is delivered within 5 seconds (streaming)
- [ ] Answer references user's specific stack and context
- [ ] Verdict is opinionated — never "it depends" without a follow-up direction
- [ ] Web search is used to ensure the tool's current state is reflected

---

## 5. Screens & Navigation

### 5.1 Screen Map

```
Drift
├── Onboarding
│   ├── Step 1 — Role & Stack
│   ├── Step 2 — Current Context
│   └── Step 3 — Workflow Profiler
├── Home (Daily Digest)
│   ├── Digest Cards (dynamic per type)
│   ├── Link Drop Input
│   └── Done State
├── Ask Drift ("Should I learn this?")
│   └── Verdict History
├── Link Drop (expanded view)
│   └── Assessment Result
└── Profile
    ├── Drift Profile Summary
    ├── Stack & Context Editor
    └── Workflow Assessment Card
```

### 5.2 Navigation Principles
- Bottom navigation bar with 4 items: Home, Ask Drift, Drop, Profile
- Link Drop is also accessible as a floating persistent input on Home
- No nested navigation deeper than 2 levels
- Every screen has a clear, single primary action

---

## 6. Design System

### 6.1 Design Principles
- **Calm over stimulating** — no red badges, no notification panic, no counters
- **Opinionated over neutral** — Drift has a point of view. The UI reflects that.
- **Generative over templated** — card layouts adapt to content type
- **Done states matter** — every flow has a satisfying, intentional end

### 6.2 Visual Direction
- **Theme:** Dark, but not black. Deep slate and navy tones with subtle depth
- **Accent:** A single cool accent color (electric indigo or cyan) used sparingly
- **Typography:** Clean, technical — monospaced for data points, humanist sans for prose
- **Motion:** Fluid, purposeful. Cards animate in. Streaming text feels alive. No gratuitous transitions.
- **Density:** Breathable. Enough whitespace that the UI never feels overwhelming

### 6.3 Card System
Cards are the core UI primitive. Each card type has a distinct visual signature:

| Card Type | Visual Signature |
|---|---|
| Tool release | Version badge, changelog diff style, impact indicator |
| Article | Clean reading card, estimated read time, source favicon |
| Video | Thumbnail area, topic tags, timestamp highlights |
| Repo | Code-like header, star count, use-case match tag |
| Verdict | Large YES/NO/NOT YET label, color coded, structured breakdown |

---

## 7. Technical Architecture

### 7.1 Frontend
- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Component Library:** shadcn/ui
- **Animation:** Framer Motion
- **State:** React Context + useReducer for profile and digest state

### 7.2 AI Layer
- **Model:** Claude (claude-sonnet-4-20250514) via Anthropic API
- **Streaming:** All AI responses stream to the UI in real time
- **Tools used:**
  - `web_search` — for digest content sourcing and verdict currency
  - `web_fetch` — for link drop content reading
- **Prompt architecture:**
  - System prompt carries the full Drift Profile on every call
  - Digest prompt instructs Claude to return structured JSON for generative UI rendering
  - Link drop and verdict prompts return structured verdict objects

### 7.3 Generative UI Pattern
Claude returns a structured JSON payload that the frontend maps to dynamic React components:

```json
{
  "card_type": "tool_release",
  "title": "Vercel AI SDK 4.0",
  "summary": "...",
  "relevance_score": 8.5,
  "relevance_reason": "You're using Next.js and building AI integrations",
  "verdict": "worth_your_time",
  "metadata": {
    "version": "4.0.0",
    "impact": "high",
    "source_url": "..."
  }
}
```

The frontend reads `card_type` and renders the corresponding component with the payload data.

### 7.4 Data Flow

```
User Profile (stack + context + workflow)
        ↓
Claude System Prompt (profile injected)
        ↓
Claude + Web Search → Structured JSON
        ↓
Frontend maps JSON → Dynamic Card Components
        ↓
User interactions (save/skip/go deeper) → State update
```

---

## 8. MVP Scope Boundaries

### 8.1 In Scope
- Onboarding flow and profile generation
- Daily digest with generative card UI (5–7 items)
- Link drop with real-time assessment
- AI Workflow Profiler
- "Should I learn this?" verdict engine
- Profile screen with context editor

### 8.2 Out of Scope (V2)
| Feature | Rationale |
|---|---|
| Community workflow snapshots | Requires user base and content moderation |
| Living AI readiness score | Requires usage history over time |
| Email / push notifications | Requires backend infrastructure |
| Weekly synthesis view | Depends on digest history accumulation |
| Saved items library | Nice to have, not core to MVP story |
| Team / shared digests | Multi-user complexity out of MVP scope |

---

## 9. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | What content sources does the AI search for the daily digest? | Product | High |
| 2 | How do we prevent the same items appearing in consecutive digests? | Engineering | High |
| 3 | Should the done state persist across sessions or reset daily? | Product | Medium |
| 4 | What's the fallback if Claude can't fetch a dropped link? | Engineering | Medium |
| 5 | How frequently should the AI Workflow Profiler prompt re-assessment? | Product | Low |

---

## 10. Timeline (Suggested)

| Phase | Scope | Duration |
|---|---|---|
| Phase 1 | Design system + Onboarding flow | Week 1 |
| Phase 2 | Daily Digest + Generative card UI | Week 2–3 |
| Phase 3 | Link Drop + Verdict streaming | Week 3–4 |
| Phase 4 | AI Workflow Profiler + Ask Drift | Week 4–5 |
| Phase 5 | Polish, motion design, portfolio prep | Week 6 |

---

*Drift PRD v1.0 — Built for portfolio. Designed for real developers.*
