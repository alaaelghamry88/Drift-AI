# OpenRouter Multi-Model Setup — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Replace the single Groq client + hardcoded model with an OpenRouter client where each API route reads its model from an env var. This makes swapping models a config change with no code edits.

---

## Architecture

### New file: `src/lib/ai.ts`

Replaces `src/lib/claude.ts`. Uses the `openai` npm package pointed at the OpenRouter base URL.

```ts
import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export const DIGEST_MODEL  = process.env.DIGEST_MODEL  ?? 'google/gemini-flash-1.5'
export const VERDICT_MODEL = process.env.VERDICT_MODEL ?? 'qwen/qwen3-235b-a22b:free'
```

### Env vars (`.env.local`)

```
OPENROUTER_API_KEY=sk-or-...
DIGEST_MODEL=google/gemini-flash-2.0-exp:free
VERDICT_MODEL=qwen/qwen3-235b-a22b:free
```

To swap a model, change the env var and redeploy — no code changes needed.

---

## Route Changes

All 6 routes currently import `{ groq, MODEL }` from `@/lib/claude`. They are updated to import from `@/lib/ai`.

| Route | Client export | Model export | Type | Notes |
|---|---|---|---|---|
| `api/digest` | `openrouter` | `DIGEST_MODEL` | Non-streaming | |
| `api/verdict` | `openrouter` | `VERDICT_MODEL` | Streaming | |
| `api/deeper` | `openrouter` | `DIGEST_MODEL` | Streaming | Digest context |
| `api/workflow` | `openrouter` | `DIGEST_MODEL` | Non-streaming | |
| `api/links/score` | `openrouter` | `DIGEST_MODEL` | Non-streaming | Uses `response_format: { type: 'json_object' }` |
| `api/links` | `openrouter` | `DIGEST_MODEL` | Non-streaming | Uses `response_format: { type: 'json_object' }` |

> `deeper`, `workflow`, `links/score`, and `links` use `DIGEST_MODEL` as the default. Each can be split into its own env var later without structural changes.

> `response_format: { type: 'json_object' }` is supported by OpenRouter for most capable models including Gemini Flash and Qwen3. The chosen `DIGEST_MODEL` must support it — both recommended free defaults do.

The internal logic of each route is **unchanged** — OpenAI SDK uses the same `.choices[0]?.delta?.content` streaming shape as Groq SDK.

---

## Package Changes

```bash
npm remove groq-sdk
npm install openai
```

---

## What Does NOT Change

- `src/hooks/use-streaming.ts` — model-agnostic SSE reader
- All frontend components — completely unaffected
- `src/lib/prompts.ts` — unchanged
- `src/lib/tavily.ts` — unchanged
- All types

---

## Non-Goals

- No per-request model selection
- No fallback logic between models
- No model performance tracking
- No UI to configure models

---

## Future Extension Points

Adding a new model slot (e.g., for a future `links/score` route) requires:
1. Add `LINKS_MODEL=...` to `.env.local`
2. Export `LINKS_MODEL` from `lib/ai.ts`
3. Import it in the route

No structural changes needed.
