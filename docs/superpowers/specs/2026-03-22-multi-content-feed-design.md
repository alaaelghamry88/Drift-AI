# Design: Multi-Content Feed (Videos + Tools + Recency Filter)

## Summary

Extend the existing Tavily fetch layer to surface real YouTube video links and ProductHunt tool listings alongside articles, and enforce a 14-day recency window. No new API keys or files required. The single LLM call and digest route remain unchanged.

## Changes

### `src/lib/tavily.ts`

**Add `days: 14` to all Tavily requests.**

The Tavily `/search` API supports a `days` parameter that limits results to the last N days. Add `days: 14` to the request body in `searchTavily()`.

**Expand `buildSearchQueries()` with two new targeted queries:**

1. `"AI ${profile.stack[0]} tutorial site:youtube.com"` — targets YouTube videos relevant to the user's primary stack technology
2. `"new AI tools for developers site:producthunt.com"` — targets ProductHunt listings for tool discovery

Total queries: 5 (up from 3). Still run in parallel with `Promise.allSettled`.

Increase the final result cap from 15 to 20 to account for the broader source pool.

### `src/lib/prompts.ts`

**Update `digestUserPrompt()` to guide card type classification:**

When real articles/results are available, explicitly instruct the LLM:
- If `source_url` contains `youtube.com` → use `card_type: "video"`
- If `source_url` contains `producthunt.com` → use `card_type: "tool_release"`
- Aim for variety: at least 1 video and 1 tool card if sources are present

No structural changes to the prompt shape or LLM call.

## Trade-offs

- Tavily may not always return YouTube results with full metadata (channel, duration) — `VideoCard` already handles missing `duration_minutes` gracefully
- ProductHunt scraping via Tavily may occasionally return product listing pages rather than individual tools — the LLM should still extract a meaningful tool name and summary
- 5 parallel Tavily queries adds ~0ms latency (already parallel); Tavily's `days` filter may slightly reduce total result count

## Out of Scope

- YouTube Data API integration (no new API keys for MVP)
- Separate ProductHunt API integration
- Thumbnail images for video cards
