# Brain Dump — Design Spec
_Date: 2026-03-23_

---

## Overview

Brain Dump is a new screen in Drift (`/dump`) that gives developers a persistent, visual canvas to offload mental clutter — notes, worries, plans, to-dos, and insights. It sits alongside the existing Digest, Drop, Ask, and Profile screens.

The core experience: a dark, spatially aware canvas where colorful sticky notes and to-do cards live, can be dragged freely, and persist across sessions via localStorage.

---

## Route & Navigation

- **Route:** `(app)/dump/page.tsx`
- **Nav label:** "Dump" — added as a new tab in `bottom-nav.tsx`
- **Nav icon:** notepad/document icon (consistent with existing nav style)
- **Bottom nav update:** The nav grows from 4 to 5 items. Reduce each item's horizontal padding from `px-5` to `px-3` and shorten "Profile" to "Me" to keep items readable on small screens.

---

## Entry Types

### Sticky Note
- Rendered as a colored card with a paper fold-corner effect and slight random rotation (–3° to +3°, assigned at creation)
- 7 color options: yellow `#f5c842`, amber `#f5a623`, green `#b8f0a0`, pink `#f5b8d4`, blue `#a8d8f5`, purple `#d4b8f5`, peach `#f5d0a0`
- Contains free-form text
- Color chosen at creation time only — no color picker on the card itself

### To-Do Card
- Rendered as a dark panel with a blue left border accent — always axis-aligned (rotation is always `0°`)
- Has a short **title** field (e.g. "Ship v2 tasks") shown at the top of the card in small caps, above the item list
- Contains a list of checkbox items
- Checking an item strikes it through and persists immediately to localStorage
- New items can be added inline via a small "+ add item" row at the bottom of the card
- No color choice

---

## Canvas

- A `div` with `position: relative` and `overflow: hidden` acting as the visible viewport
- Cards are `position: absolute` at `{ x, y }` within the canvas
- **Card position bounds:** All cards are clamped so their top-left corner stays within `[0, canvasWidth - cardWidth]` × `[0, canvasHeight - cardHeight]`. This prevents cards from being orphaned off-screen. Canvas pan is not implemented in v1; bounds clamping is the mechanism that keeps all cards reachable.
- **Canvas dimensions:** Obtained at runtime via a `ResizeObserver` on the canvas `div` ref. Stored in state as `{ width, height }`. On resize, existing cards are re-clamped to the new bounds.
- **Card dimensions:** Sticky notes render at a fixed `200px × 200px`. To-do cards render at a fixed `240px` wide × `auto` height capped at `320px`. These fixed values are used in the clamping formula. If a to-do card's natural height is needed for clamping, use `240px` as a safe max approximation.
- **"Central 60%" placement:** The card's **top-left corner** is constrained to the zone `[canvasWidth * 0.2, canvasWidth * 0.8 - cardWidth]` × `[canvasHeight * 0.2, canvasHeight * 0.8 - cardHeight]`. A random value is picked uniformly within each axis.
- Subtle dot grid background for spatial depth
- Soft radial gradient atmosphere (matches Drift's existing dark aesthetic)

---

## Drag Behaviour

- Implemented with native pointer events: `onPointerDown` → track delta on `onPointerMove` → commit position on `onPointerUp`
- Each card calls `e.currentTarget.setPointerCapture(e.pointerId)` on drag start
- Position is clamped to canvas bounds on every move
- On drag end: `updateNotePosition` / `updateTodoPosition` is called and the full entries array is written to localStorage
- Dragging card is elevated with `z-index: 50` during drag, reset on release
- Drag threshold: movement must exceed 4px before a drag is initiated — this prevents accidental drags on tap/click

---

## Creation Flow (Bottom Sheet)

Triggered by the `+` FAB (`z-index: 60`, bottom-right, above the nav bar at `z-index: 50`). FAB icon changes to `✕` while the sheet is open. Tapping the backdrop or `✕` dismisses the sheet.

### Sticky Note — 3 steps displayed in a step breadcrumb: `① Type › ② Color › ③ Write`

**Step 1 — Type**
Two buttons: "Sticky Note" (selected) and "To-Do List". Tapping "To-Do List" collapses the sheet to 2 steps.

**Step 2 — Color**
A row of 7 color swatches (`color-swatch.tsx`). Tapping a swatch makes it active (checkmark ring, scale 1.12). Default: yellow. The step breadcrumb updates to show current step.

**Step 3 — Write**
- Single `<textarea>` placeholder: "What's on your mind?"
- Below the textarea: a flat mini-preview rendered as a small sticky-note shape in the chosen color, no rotation, with the fold-corner effect. Updates live as the user types. Fixed height of ~60px; text truncates with ellipsis if it overflows the preview.
- Validation: submit is disabled if the textarea is empty (button opacity 0.4, not clickable)

### To-Do — 2 steps: `① Type › ② Write`

Tapping "To-Do List" on Step 1 skips directly to a 2-step flow (no color step).

**Step 2 — Write**
- **Title field:** short text input, placeholder "List title (e.g. 'Ship v2 tasks')" — required, max 40 chars
- **Item rows:** starts with 2 empty rows, each a text input. A `+ add item` link appends a new empty row (max 10 items)
- Validation: submit disabled if title is empty or all item rows are blank. Empty item rows are stripped on submit (not saved).
- A to-do card must have at least 1 non-empty item to be submitted

**Submit (both types):** "Drop it on the board →"
- New card animates onto the canvas (Framer Motion spring: scale 0.8 → 1.0, y –12 → 0, 300ms)
- Placed at a random position within the central 60% of the canvas to avoid edge clustering
- Sheet dismisses after animation starts

---

## Animations

- **Card creation:** Framer Motion spring scale-in (`scale: 0.8 → 1`, `y: -12 → 0`, spring stiffness 280, damping 22)
- **Drag:** No animation during drag — card follows pointer directly
- **Checkbox toggle:** `scale: 1 → 1.2 → 1` pulse (80ms total) on the checkbox element
- **Sheet open:** slide up from `translateY(100%)` to `translateY(0)`, 220ms ease-out
- **Sheet close:** slide down, 180ms ease-in
- **Delete:** card scales to 0 and fades out (200ms) before being removed from state. Implemented via Framer Motion `AnimatePresence` wrapping the card list, with an `exit` variant of `{ scale: 0, opacity: 0, transition: { duration: 0.2 } }`.

---

## Data Model

Stored in localStorage under the key `drift-brain-dump`.

```ts
// src/types/brain-dump.ts

export interface NoteEntry {
  id: string;
  type: 'note';
  color: string;       // hex value of chosen color
  text: string;
  x: number;
  y: number;
  rotation: number;    // degrees, –3 to +3, fixed at creation
  createdAt: number;   // unix ms
}

export interface TodoEntry {
  id: string;
  type: 'todo';
  title: string;
  items: { id: string; text: string; done: boolean }[];
  x: number;
  y: number;
  rotation: number;    // always 0 for to-do cards
  createdAt: number;
}

export type BrainDumpEntry = NoteEntry | TodoEntry;
```

Helper functions in `src/lib/brain-dump.ts` — use `interface` style matching existing project conventions:

```ts
loadEntries(): BrainDumpEntry[]
saveEntries(entries: BrainDumpEntry[]): void

// Narrowed update helpers — avoids Partial<discriminated-union> issues
updateNotePosition(id: string, x: number, y: number): void
updateNoteText(id: string, text: string): void
updateTodoPosition(id: string, x: number, y: number): void
updateTodoItem(id: string, itemId: string, patch: { text?: string; done?: boolean }): void
addTodoItem(id: string, item: { id: string; text: string; done: boolean }): void

addEntry(entry: BrainDumpEntry): void
deleteEntry(id: string): void
updateTodoTitle(id: string, title: string): void
```

**Persistence timing:**
- Drag end: position written immediately
- Checkbox toggle: written immediately on every toggle (no debounce needed — it's a single boolean flip)
- All helpers call `saveEntries` internally after mutating the array

---

## Top Bar

- Title: "Brain Dump"
- Subtitle: "Your mental workspace"
- Right side: pill counts — "N notes" · "N to-dos" (derived from entry count, updates reactively)

---

## Empty State

When `entries.length === 0`: centered on the canvas —

> "Nothing here yet. Tap + to unload your head."

Below the text: a small upward-bouncing arrow (`↑`) in muted color, `animate-bounce` (Tailwind), pointing diagonally toward the FAB in the bottom-right. Arrow is `#4a90e2` at 40% opacity.

---

## Card Actions

**Delete:**
- Desktop: a small `×` button appears in the top-right corner of the card on hover (`opacity: 0 → 1` on `group-hover`)
- Mobile: long-press (500ms threshold). Visual feedback during hold: card border pulses (scale 1 → 1.03 → 1, repeating). Releasing before 500ms cancels. Releasing after 500ms reveals the `×` button until the user taps elsewhere.
- Tapping `×` triggers the delete animation (scale + fade out, 200ms), then removes from state and persists

**Long-press vs drag disambiguation:** The drag threshold (4px movement) takes priority. If the pointer moves more than 4px during a hold, the long-press timer is cancelled and drag begins normally.

**To-Do item editing:** Tapping a to-do item's text opens an inline text input on that row. Blur or Enter commits the change and persists immediately.

---

## `color-swatch.tsx`

A small presentational component used exclusively inside `add-sheet.tsx`. Props:

```ts
interface ColorSwatchProps {
  color: string;      // hex
  active: boolean;
  onClick: () => void;
}
```

Not used anywhere else — it is not rendered on the canvas cards.

---

## File Structure

```
src/
  app/
    (app)/
      dump/
        page.tsx               ← canvas screen, loads entries from localStorage
  components/
    dump/
      brain-dump-canvas.tsx    ← canvas wrapper, renders all cards, owns drag state
      sticky-note.tsx          ← sticky note card (color, text, rotation, drag, delete)
      todo-card.tsx            ← to-do card (title, items, checkboxes, drag, delete)
      add-sheet.tsx            ← bottom sheet: type → color → write flow
      color-swatch.tsx         ← single color swatch button (used in add-sheet only)
  lib/
    brain-dump.ts              ← localStorage helpers (narrowed update functions)
  types/
    brain-dump.ts              ← NoteEntry, TodoEntry, BrainDumpEntry interfaces
```

---

## Out of Scope (for this version)

- Canvas pan / scroll beyond initial viewport (replaced by position clamping)
- Edit-in-place for sticky note text — delete and recreate
- Search or filter entries
- Tags or categories
- Sharing or export
- Sync across devices
- Infinite canvas / zoom
