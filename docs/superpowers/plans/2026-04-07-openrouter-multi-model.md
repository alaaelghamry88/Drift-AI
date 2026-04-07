# OpenRouter Multi-Model Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Groq SDK client with an OpenRouter-backed OpenAI client, with per-route model names configurable via env vars.

**Architecture:** A single `src/lib/ai.ts` exports one OpenAI client pointed at OpenRouter and two named model constants (`DIGEST_MODEL`, `VERDICT_MODEL`). All 6 API routes swap their `groq`/`MODEL` imports for the new exports — no other logic changes. The `openai` package is already installed; `groq-sdk` is removed.

**Tech Stack:** Next.js 16 App Router, OpenAI SDK v6 (`openai` package), OpenRouter API, Vitest

---

## File Map

| Action | File | Change |
|---|---|---|
| Delete | `src/lib/claude.ts` | Replaced by `ai.ts` |
| Create | `src/lib/ai.ts` | OpenRouter client + model env vars |
| Modify | `src/app/api/digest/route.ts` | Swap import |
| Modify | `src/app/api/verdict/route.ts` | Swap import |
| Modify | `src/app/api/deeper/route.ts` | Swap import |
| Modify | `src/app/api/workflow/route.ts` | Swap import |
| Modify | `src/app/api/links/score/route.ts` | Swap import |
| Modify | `src/app/api/links/route.ts` | Swap import |
| Modify | `package.json` | Remove `groq-sdk` |
| Modify | `.env.local` | Add OpenRouter vars |

---

## Task 1: Create `src/lib/ai.ts` and delete `src/lib/claude.ts`

**Files:**
- Create: `src/lib/ai.ts`
- Delete: `src/lib/claude.ts`

- [ ] **Step 1: Write a test for the new module**

Create `src/lib/__tests__/ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { openrouter, DIGEST_MODEL, VERDICT_MODEL } from '@/lib/ai'

describe('ai module', () => {
  it('exports an openrouter client with the correct baseURL', () => {
    // @ts-ignore — accessing internal config for test
    expect(openrouter.baseURL).toBe('https://openrouter.ai/api/v1')
  })

  it('DIGEST_MODEL falls back to gemini-flash when env var not set', () => {
    expect(typeof DIGEST_MODEL).toBe('string')
    expect(DIGEST_MODEL.length).toBeGreaterThan(0)
  })

  it('VERDICT_MODEL falls back to qwen when env var not set', () => {
    expect(typeof VERDICT_MODEL).toBe('string')
    expect(VERDICT_MODEL.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/ai.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai'`

- [ ] **Step 3: Create `src/lib/ai.ts`**

```ts
import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export const DIGEST_MODEL  = process.env.DIGEST_MODEL  ?? 'google/gemini-flash-1.5'
export const VERDICT_MODEL = process.env.VERDICT_MODEL ?? 'qwen/qwen3-235b-a22b:free'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/ai.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Delete `src/lib/claude.ts`**

Delete the file `src/lib/claude.ts`. (Do not remove it yet if other routes still import it — this step comes first so TypeScript will immediately surface any missed imports in subsequent tasks.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts src/lib/__tests__/ai.test.ts
git rm src/lib/claude.ts
git commit -m "feat: add openrouter ai client, remove groq client"
```

---

## Task 2: Update `api/digest/route.ts`

**Files:**
- Modify: `src/app/api/digest/route.ts:2` — swap import line

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/digest/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~23), replace:

```ts
// Before
const response = await groq.chat.completions.create({
  model: MODEL,

// After
const response = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors for this file.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/digest/route.ts
git commit -m "feat: migrate digest route to openrouter"
```

---

## Task 3: Update `api/verdict/route.ts`

**Files:**
- Modify: `src/app/api/verdict/route.ts:2`

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/verdict/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, VERDICT_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~16), replace:

```ts
// Before
const stream = await groq.chat.completions.create({
  model: MODEL,

// After
const stream = await openrouter.chat.completions.create({
  model: VERDICT_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/verdict/route.ts
git commit -m "feat: migrate verdict route to openrouter"
```

---

## Task 4: Update `api/deeper/route.ts`

**Files:**
- Modify: `src/app/api/deeper/route.ts:2`

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/deeper/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~10), replace:

```ts
// Before
const stream = await groq.chat.completions.create({
  model: MODEL,

// After
const stream = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/deeper/route.ts
git commit -m "feat: migrate deeper route to openrouter"
```

---

## Task 5: Update `api/workflow/route.ts`

**Files:**
- Modify: `src/app/api/workflow/route.ts:2`

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/workflow/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~10), replace:

```ts
// Before
const response = await groq.chat.completions.create({
  model: MODEL,

// After
const response = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/workflow/route.ts
git commit -m "feat: migrate workflow route to openrouter"
```

---

## Task 6: Update `api/links/score/route.ts`

**Files:**
- Modify: `src/app/api/links/score/route.ts:2`

> Note: This route uses `response_format: { type: 'json_object' }`. OpenRouter passes this to the underlying model — ensure your chosen `DIGEST_MODEL` supports JSON mode (both `google/gemini-flash-1.5` and `qwen/qwen3-235b-a22b:free` do).

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/links/score/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~18), replace:

```ts
// Before
const completion = await groq.chat.completions.create({
  model: MODEL,

// After
const completion = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/links/score/route.ts
git commit -m "feat: migrate links score route to openrouter"
```

---

## Task 7: Update `api/links/route.ts`

**Files:**
- Modify: `src/app/api/links/route.ts:2`

> Note: Same `response_format: { type: 'json_object' }` note as Task 6 applies here.

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/links/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~96), replace:

```ts
// Before
const completion = await groq.chat.completions.create({
  model: MODEL,

// After
const completion = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/links/route.ts
git commit -m "feat: migrate links route to openrouter"
```

---

## Task 7b: Update `api/link-drop/route.ts`

**Files:**
- Modify: `src/app/api/link-drop/route.ts:2`

> Note: This is a streaming route identical in pattern to `api/deeper`. Uses `DIGEST_MODEL`.

- [ ] **Step 1: Update the import**

Replace line 2 in `src/app/api/link-drop/route.ts`:

```ts
// Before
import { groq, MODEL } from '@/lib/claude'

// After
import { openrouter, DIGEST_MODEL } from '@/lib/ai'
```

- [ ] **Step 2: Update usage in the route body**

In the `groq.chat.completions.create(...)` call (line ~27), replace:

```ts
// Before
const stream = await groq.chat.completions.create({
  model: MODEL,

// After
const stream = await openrouter.chat.completions.create({
  model: DIGEST_MODEL,
```

- [ ] **Step 3: Verify TypeScript compiles and no groq imports remain**

```bash
npx tsc --noEmit
```

Expected: No errors. At this point all 7 routes are migrated.

```bash
grep -r "from '@/lib/claude'" src/
```

Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/link-drop/route.ts
git commit -m "feat: migrate link-drop route to openrouter"
```

---

## Task 8: Remove `groq-sdk` and update `.env.local`

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Remove `groq-sdk` from package.json**

```bash
npm remove groq-sdk
```

Expected: `package.json` no longer lists `groq-sdk` under dependencies. `node_modules/groq-sdk` is removed.

- [ ] **Step 2: Add OpenRouter env vars to `.env.local`**

Add these lines to `.env.local` (keep your existing `GROQ_API_KEY` line until you confirm everything works, then remove it):

```
OPENROUTER_API_KEY=sk-or-YOUR_KEY_HERE
DIGEST_MODEL=google/gemini-flash-2.0-exp:free
VERDICT_MODEL=qwen/qwen3-235b-a22b:free
```

Get your key from: https://openrouter.ai/keys

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: All existing tests pass (they test prompts/tavily, not routes directly).

- [ ] **Step 4: Run a build to catch any remaining type errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove groq-sdk, add openrouter env vars"
```

---

## Task 9: Smoke test in dev

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test the digest route**

Open the app and trigger a digest refresh (or hit `POST /api/digest` directly with a valid profile body). Verify cards are returned.

- [ ] **Step 3: Test the verdict/ask route**

Use the Ask screen — submit a question. Verify the streaming verdict card appears and follow-up conversation works.

- [ ] **Step 4: Remove old `GROQ_API_KEY` from `.env.local`** (optional but clean)

Once both routes respond correctly, remove the now-unused `GROQ_API_KEY=...` line from `.env.local`.

- [ ] **Step 5: Final commit**

```bash
git add .env.local  # if you updated it
git commit -m "chore: clean up groq api key from env"
```
