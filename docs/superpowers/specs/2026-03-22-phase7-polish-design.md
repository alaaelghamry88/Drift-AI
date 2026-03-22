# Phase 7 — Polish Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Summary

Phase 7 polishes the Drift app for portfolio quality. Most items are already implemented in the codebase. The remaining work is fixing a structural inconsistency in the home page and wiring up the existing `pageFade` animation via a new `template.tsx` file.

---

## What Is Already Done

The following Phase 7 items are fully implemented and require no changes:

- **Background atmosphere** — `drift-bg` class in `globals.css` has two animated gradient orbs (`drift-orb-primary` 22s, `drift-orb-secondary` 30s) plus a `body::after` grain noise texture overlay.
- **Bottom navigation** — `BottomNav` component is live in `(app)/layout.tsx`, frosted glass bar with active state glow.
- **Mobile responsive layout** — All screens use `max-w-[680px]`, `px-4 md:px-6`, `pb-28` for nav clearance.
- **Loading/skeleton states** — `CardSkeleton` in `digest-screen.tsx`, spinner in `(app)/layout.tsx` profile guard, loading state in profile page workflow assessment.
- **Error states** — Digest, profile, and drop pages all have error states with retry buttons.
- **Empty states** — All four app screens have first-visit empty states.

---

## What Needs Implementation

### 1. Fix Home Page Structure

**Problem:** `src/app/page.tsx` duplicates the header and `BottomNav` that `(app)/layout.tsx` already provides. The home page is not inside the `(app)` route group, so it bypasses the shared layout, profile guard, and transitions.

**Fix:**
- Delete `src/app/page.tsx`
- Create `src/app/(app)/page.tsx` — renders only `<DigestScreen profile={profile!} />` with no wrapping div. The layout's existing content wrapper (`<div className="relative z-10 mx-auto max-w-[680px] px-4 md:px-6 pb-28">`) already provides the correct container, consistent with how `/drop`, `/ask`, and `/profile` pages render their top-level `<div className="space-y-5">`.
- `profile!` is safe here because the layout's profile guard redirects to `/stack` and shows a spinner before children render. If the guard is ever removed, this assertion must be revisited.
- Route stays at `/`.

### 2. Wire Page Transitions via `template.tsx`

**Why `template.tsx` not `layout.tsx`:** In Next.js 14 App Router, `layout.tsx` persists across navigations within the same route group — it never unmounts. This means `AnimatePresence` cannot detect child removal and exit animations do not fire. `template.tsx` creates a **new component instance on every navigation**, which is exactly what `AnimatePresence` needs to trigger the `exit` lifecycle.

**`pageFade`** is already defined in `src/lib/motion.ts`:
```ts
export const pageFade = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.3, ease: easings.gentle }
}
```

**Create `src/app/(app)/template.tsx`:**

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { pageFade } from '@/lib/motion'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname} {...pageFade}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

`layout.tsx` is not modified — it continues to own the `drift-bg` shell, header, and `BottomNav`. Next.js automatically applies `template.tsx` as an inner wrapper around the layout's `{children}`.

**Behaviour:** On every navigation between `/`, `/drop`, `/ask`, `/profile`, the current page fades out (300ms) then the next fades in (300ms). `mode="wait"` ensures sequential, not overlapping.

### 3. Commit Untracked Profile Page

`src/app/(app)/profile/` is currently untracked in git (`??` status). Stage and commit it so all app screens are tracked before Phase 7 is considered complete.

### 4. Mark Phase 7 Complete

Change all `- [ ]` items under `## Phase 7 — Polish` in `docs/drift-implementation-plan.md` to `- [x]`.

---

## File Change Summary

| File | Action |
|------|--------|
| `src/app/page.tsx` | Delete |
| `src/app/(app)/page.tsx` | Create — renders `<DigestScreen profile={profile!} />` only |
| `src/app/(app)/template.tsx` | Create — AnimatePresence + pageFade wrapper |
| `src/app/(app)/profile/` | Stage untracked files and commit |
| `docs/drift-implementation-plan.md` | Edit — change `- [ ]` to `- [x]` for all Phase 7 items |

---

## Out of Scope

- Onboarding page transitions (user confirmed: main app screens only)
- Any refactoring of existing error/empty/loading states (already correct)
- Any design changes to existing components
- Modifying `(app)/layout.tsx` (no changes needed)
