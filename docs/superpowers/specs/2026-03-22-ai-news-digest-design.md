# AI News Digest — Design Spec
Date: 2026-03-22

## Problem

The digest route asks Llama 3.3 (via Groq) to "use web search" but the model has no actual web search capability. It hallucinates news from training data, producing stale articles with broken URLs.

## Goal

Replace hallucinated news with real, recent AI news fetched from Tavily, curated and formatted by the LLM through the lens of the user's role, stack, and current project context.

## Data Flow

```
Profile → 3 Tavily searches (parallel, 5s timeout) → deduplicated real articles → LLM → DigestCards with real URLs
```

The LLM's job shifts from *generating* news to *curating and formatting* real news. It receives up to 15 real articles and selects the 5–7 most relevant for the user.

## Architecture

### New: `src/lib/tavily.ts`

**`buildSearchQueries(profile: DriftProfile): string[]`**

Returns 3 queries:
1. `"AI tools and LLM news this week"` — broad AI news
2. `"AI ${profile.stack.join(' ')} ${new Date().getFullYear()}"` — AI in their stack
3. `"AI ${profile.currentContext.slice(0, 60)} ${new Date().getFullYear()}"` — AI in their project domain

`currentContext` is passed as raw natural language (trimmed to 60 characters) — Tavily's search handles free-text queries well and preserves compound domain terms (e.g. "RAG pipeline", "SaaS dashboard"). No keyword extraction needed.

**`fetchAINews(profile: DriftProfile): Promise<TavilyResult[]>`**

Runs all 3 queries in parallel via `Promise.all`. Each call:
- `POST https://api.tavily.com/search`
- Headers: `{ "Content-Type": "application/json" }`
- Body: `{ api_key: process.env.TAVILY_API_KEY, query, search_depth: "basic", max_results: 7, topic: "news" }`
- Response envelope: `{ results: TavilyResult[] }`
- Timeout: 5 seconds per call (via `AbortController`)

After collecting results: deduplicates by URL, sorts by `published_date` descending (undated results go last), trims to top 15.

```ts
interface TavilyResult {
  title: string
  url: string
  content: string        // snippet
  published_date?: string
  score: number          // Tavily relevance score
}
```

**Credit usage:** `search_depth: "basic"` costs 1 credit per call. 3 calls per refresh = 3 credits. Free tier (1000/month) supports ~333 digest refreshes/month.

### Modified: `src/app/api/digest/route.ts`

1. Call `fetchAINews(profile)` before the LLM
2. If Tavily fails entirely (throws or times out): log warning, proceed to LLM with `articles = []`
3. Pass `articles` into `digestUserPrompt(profile, articles)`

### Modified: `src/lib/prompts.ts`

**New signature:**
```ts
digestUserPrompt(profile: DriftProfile, articles: TavilyResult[]): string
```

When `articles.length > 0`:
- Format as numbered list: `[N] title | url | snippet`
- Instruct LLM: "Select 5–7 from the articles provided below. Only use articles from this list — do not invent titles or URLs not present here. Set `source_url` to the article's URL."
- Restrict allowed `card_type` values to `"article"` and `"tool_release"` (Tavily returns web articles, not videos or GitHub repos)

When `articles.length === 0` (fallback):
- Existing prompt behaviour unchanged (LLM generates from training knowledge)
- All `card_type` values remain valid in this fallback path

**`digestSystemPrompt` is unchanged.**

### `.env.local`

Add:
```
TAVILY_API_KEY=tvly-...
```

Confirm `.env.local` is listed in `.gitignore` before committing any app code.

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Tavily fetch throws / times out (5s) | Log warning, fall back to LLM-only (existing behaviour) |
| Tavily returns 0 results | Same as above — fall back to LLM-only |
| Tavily returns 1–14 results | Proceed with available results; LLM selects from what's there, no hallucination fill |
| LLM produces invalid JSON | Existing error handling in route unchanged |

## What Does NOT Change

- `DigestCard` type and all metadata types
- `useDigest` hook
- Per-day localStorage caching
- All other API routes (`deeper`, `verdict`, `link-drop`, `workflow`)
- UI components

## Out of Scope

- UI changes
- Changing the card type system
- Streaming the digest
- Switching the LLM provider
