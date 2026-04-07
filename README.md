# Drift — Your Daily AI Intelligence Layer

**Drift** is an AI-powered daily digest and decision tool built for developers navigating the fast-moving AI and tech landscape. Instead of endless feeds, newsletters, and tab hoarding, Drift delivers a ruthlessly curated daily briefing of 5–7 items that actually matter to *your* stack, role, and current project.

> "Calm, intelligent signal — not more noise."

---

## The Problem

Developers today face a relentless stream of new tools, frameworks, model releases, and techniques. Keeping up feels like a job in itself. The result: information anxiety, half-read tabs, neglected newsletters, and an ever-growing "read later" backlog that never gets read.

Most aggregators solve the wrong problem. They surface more — more posts, more links, more opinions. What developers actually need is less, but better: signal that's relevant to *what they're building right now*, with clear verdicts instead of endless options.

---

## The Solution

Drift acts as an intelligent layer between the noise and your attention. It learns your stack, role, and current project context, then:

- **Delivers a daily digest** of the 5–7 most relevant things you should know about today
- **Answers "Should I learn this?"** with opinionated YES / NOT YET / SKIP verdicts
- **Scores and organizes saved links** against your current work context so nothing gets lost in a tab graveyard

No backlog. No accumulation anxiety. Every day ends in a clear "You're all caught up" state.

---

## Target Users

**Alex the Builder** — A mid-to-senior developer or indie hacker building with AI. Constantly evaluating new tools. Wants strategic clarity, not more reading.

**Sara the Lead** — An engineering lead or technical founder who needs to stay sharp on the AI landscape without spending hours on it. Values opinionated takes over neutral summaries.

---

## Features

### Daily Digest

The core of the app. Every day, Claude generates a personalized briefing based on your Drift Profile.

- **5–7 items maximum** — no infinite scroll, no backlog
- **Generative card UI** — each card renders differently based on content type:
  - **Tool Release** — version badge, changelog diff, impact score
  - **Article** — read time, key takeaways, source
  - **Video** — thumbnail, topic tags, key timestamps
  - **Repository** — stars, use-case match, language, GitHub link
  - **Skill / Concept** — why it matters now, suggested learning path
- **Relevance score (1–10)** on every card with a plain-English reason
- **Go Deeper** — streams additional detail inline without leaving the card
- **Save / Skip** actions on every item
- **Missed days** show a synthesis paragraph, not a backlog
- Done state: a clean, satisfying "You're all caught up" screen

---

### Ask Drift — Verdict Engine

A dedicated screen for answering the developer's most common question: *"Should I learn this?"*

- Free-text input: *"Is MCP worth learning?"* or *"Should I use LangGraph?"*
- Claude queries the web in real time for current, accurate context
- Returns a **structured verdict**:
  - **Verdict:** YES / NOT YET / SKIP — always opinionated, never "it depends"
  - **Confidence:** High or Medium
  - **For you** — tailored reasoning based on your stack and context
  - **The case for** — strongest reasons to adopt
  - **The case against** — reasons to skip or wait
  - **Better alternative** — if one exists
- Multi-turn conversation: follow up with clarifying questions
- Full verdict history saved and searchable

---

### Drop — Link Library

A personal link library for saving and triaging links, with AI-powered relevance scoring, collections, and a weekly digest tied to your current work context.

- **URL input** — paste any link directly on the page to save it instantly
- **Auto-metadata extraction** — title, summary, thumbnail, favicon, and content type detected automatically (video, article, repo, tweet)
- **Context bar** — set or update what you're building; all saved links are rescored against it in real time
- **Relevance scoring** — Claude scores every link 0–10 against your current context and splits the list into:
  - **Relevant to you now** — links scoring 6 and above
  - **Other saved** — everything else
- **Collections** — organize links into named, emoji-tagged buckets; switch between them via a horizontal pill bar; create new collections inline without leaving the page
- **Save-time enrichment** — after a link saves, the card briefly expands to let you add a note ("why I saved this"), assign it to a collection, and edit its tags before collapsing automatically
- **Notes** — each link can carry a personal annotation displayed as an italicised aside beneath the title
- **AI clustering nudge** — Drift analyses your uncollected links and suggests a collection name when it detects 3+ thematically related links; one tap creates the collection and pre-assigns the matching links
- **Weekly digest banner** — after 7+ links saved in a week, a recap banner appears at the top of Drop showing count, unread links, and active collections; tapping opens a full sheet with an AI-generated one-line summary of your week's themes and a per-collection breakdown
- **Type filtering** — filter chips for video, article, repo, tweet, or view all
- **Link lifecycle management** — four actions per link:
  - **Assign** — add or remove the link from any collection
  - **Read** — marks it done (muted, strikethrough title)
  - **Keep** — pins it so it never auto-archives
  - **Remove** — deletes it permanently
- **Auto-archival** — links expire after 7 days unless marked as kept; a warning nudge appears 24 hours before expiry
- **Save sheet** — floating `+` button accessible from other screens for quick capture without navigating away

---

### Drift Profile & Onboarding

Drift personalizes everything based on your profile, collected during a short 3-step onboarding flow.

- **Stack selection** — 36+ tech options from React to Rust to LLM APIs
- **Role** — 9 options from Frontend Developer to Technical Founder
- **Current context** — free text: *"What are you building right now?"*
- **AI Workflow Assessment** — 5 questions that generate a tailored AI maturity analysis with:
  - Current workflow summary
  - 3 ranked, actionable recommendations with effort badges
  - Quick-win suggestions you can try today
- Profile is editable at any time from the Profile screen
- Context can be updated inline without re-running full onboarding

---

### Activity Tracking & Weekly Stats

Drift tracks engagement to surface your patterns.

- Logs: links saved, verdicts made, digest completions, streaks
- Weekly stats dashboard visible on the Profile screen
- Streak tracking for consecutive days of engagement

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| AI Model | Claude (Anthropic API) — digest, verdicts, workflow |
| AI Tools | `web_search` for real-time research |
| Secondary Model | Llama 3.3-70b via Groq (select operations) |
| Persistence | localStorage (client-side MVP, no backend) |
| PWA | next-pwa + Web Share Target |

---

## Architecture Overview

```
User Profile
    │
    ▼
Claude System Prompt (role + stack + context)
    │
    └── web_search (news, tool research, currency verification)
         │
         ▼
    Structured JSON Response
         │
         ▼
    Generative UI (dynamic card rendering per type)
         │
         ▼
    React State → localStorage persistence
```

All AI responses stream to the UI in real time. The frontend renders dynamic card layouts based on the content type returned by Claude — not hardcoded templates.

---

## App Structure

```
/onboarding
├── /stack        → Role + tech stack selection
├── /context      → "What are you building?" input
└── /profiler     → AI workflow assessment

/app (protected — requires profile)
├── /             → Daily digest (home)
├── /drop         → Link library with context scoring
├── /ask          → Ask Drift verdict engine + history
└── /profile      → Profile, context editor, workflow assessment
```

---

## Design Language

Drift's visual identity is built around a single idea: **calm, deep, alive** — like floating on clear ocean water at dawn.

- **Background:** Deep slate/navy (`#0A2535` → `#163D52` elevated surfaces)
- **Accent:** Bioluminescent teal (`#4DD9C0`) for primary actions and glows
- **Signal:** Gold (`#E8C97A`) for high-relevance items, amber for warnings
- **Typography:** Sora (headings) + Plus Jakarta Sans (body) + JetBrains Mono (data)
- **Motion:** Spring physics for cards, staggered reveals (80ms between items), streaming text with blur-fade
- **No snap animations** — everything feels organic and unhurried

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need an Anthropic API key (and optionally a Groq API key) set in `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

---

## Status

Drift is a feature-complete MVP. All core features are implemented and functional:

- [x] Onboarding & Drift Profile
- [x] Daily AI Digest with generative card UI
- [x] Ask Drift verdict engine
- [x] Drop — link library with AI relevance scoring
- [x] AI Workflow Assessment
- [x] Activity tracking & weekly stats
