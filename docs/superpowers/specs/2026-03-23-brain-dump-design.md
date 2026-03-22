# Brain Dump — Design Spec
_Date: 2026-03-23_

---

## Overview

Brain Dump is a new screen in Drift (`/dump`) that gives developers a persistent, visual canvas to offload mental clutter — notes, worries, plans, to-dos, and insights. It sits alongside the existing Digest, Drop, Ask, and Profile screens.

The core experience: a dark infinite-feeling canvas where colorful sticky notes and to-do cards live, can be dragged freely, and persist across sessions via localStorage.

---

## Route & Navigation

- **Route:** `(app)/dump/page.tsx`
- **Nav label:** "Dump" — added as a new tab in `bottom-nav.tsx`
- **Nav icon:** document/notepad icon (consistent with existing nav style)

---

## Entry Types

### Sticky Note
- Rendered as a colored card with a paper fold-corner effect
- 7 color options: yellow `#f5c842`, amber `#f5a623`, green `#b8f0a0`, pink `#f5b8d4`, blue `#a8d8f5`, purple `#d4b8f5`, peach `#f5d0a0`
- Slight random rotation applied on creation (–3° to +3°)
- Contains free-form text
- No color picker shown on the card itself — color is chosen at creation time only

### To-Do Card
- Rendered as a dark panel with a blue left border accent
- Contains a list of items, each with a checkbox
- Checking an item strikes it through
- New items can be added inline (tap "+ add item" at the bottom of the card)
- No color choice — always dark with blue accent

---

## Canvas

- Large `div` with `position: relative`, `overflow: hidden` for the viewport, conceptually infinite via pointer drag-to-pan (optional stretch goal)
- Subtle dot grid background for spatial depth
- Soft radial gradient atmosphere (matches Drift's existing dark aesthetic)
- Cards are `position: absolute`, positioned by `{ x, y }` stored in state

---

## Drag Behaviour

- Implemented with native pointer events: `onPointerDown` → track delta on `onPointerMove` → commit position on `onPointerUp`
- Each card captures the pointer on drag start (`setPointerCapture`)
- Position stored as `{ x, y }` in the entry's state and persisted to localStorage on every drag end
- Cards are brought to the front (`z-index`) while dragging

---

## Creation Flow (Bottom Sheet)

Triggered by the `+` FAB (bottom-right, above the nav bar). FAB icon changes to `✕` while the sheet is open.

**Step 1 — Type**
Two buttons: "Sticky Note" and "To-Do List"

**Step 2 — Color** _(Sticky Note only, skipped for To-Do)_
A row of 7 color swatches. Active swatch has a checkmark ring. Defaults to yellow.

**Step 3 — Write**
- Sticky Note: single textarea ("What's on your mind?") + live mini-preview below in the chosen color
- To-Do: textarea per item with an "+ add item" link to add more rows

**Submit:** "Drop it on the board →" button. Card animates onto the canvas (Framer Motion spring drop-in).

Sheet dismisses on submit or on `✕` / backdrop tap.

---

## Animations

- **Card creation:** Framer Motion spring scale-in from 0.8 → 1.0 with slight y offset, landing at a random rotation
- **Drag:** No animation during drag (follows pointer directly). On release, a subtle spring settle if the card lands near its final position
- **Sheet open/close:** Slide up / slide down (200ms ease)
- **Checkbox toggle:** Quick scale pulse on the checkbox

---

## Data Model

Stored in localStorage under the key `drift-brain-dump`.

```ts
type BrainDumpEntry =
  | {
      id: string;
      type: 'note';
      color: string;       // hex value of chosen color
      text: string;
      x: number;
      y: number;
      rotation: number;    // degrees, –3 to +3
      createdAt: number;   // unix ms
    }
  | {
      id: string;
      type: 'todo';
      items: { id: string; text: string; done: boolean }[];
      x: number;
      y: number;
      rotation: number;
      createdAt: number;
    };
```

Helper functions in `src/lib/brain-dump.ts`:
- `loadEntries(): BrainDumpEntry[]`
- `saveEntries(entries: BrainDumpEntry[]): void`
- `addEntry(entry: BrainDumpEntry): void`
- `updateEntry(id: string, patch: Partial<BrainDumpEntry>): void`
- `deleteEntry(id: string): void`

---

## Top Bar

- Title: "Brain Dump"
- Subtitle: "Your mental workspace"
- Right side: pill counts — "N notes" · "N to-dos"

---

## Empty State

When no entries exist yet: a centered prompt on the canvas —
> "Nothing here yet. Tap + to unload your head."

Subtle animated arrow pointing toward the FAB.

---

## Card Actions (on long-press or hover)

- **Delete:** small `×` appears in the top-right corner of the card on hover (desktop) or long-press (mobile)
- No edit-in-place for sticky notes — delete and recreate (keeps the UI simple)
- To-do items are editable inline (tap to edit text, tap checkbox to toggle)

---

## File Structure

```
src/
  app/
    (app)/
      dump/
        page.tsx             ← canvas screen
  components/
    dump/
      brain-dump-canvas.tsx  ← canvas wrapper, drag orchestration
      sticky-note.tsx        ← sticky note card
      todo-card.tsx          ← to-do card with checkboxes
      add-sheet.tsx          ← bottom sheet creation flow
      color-swatch.tsx       ← color picker row
  lib/
    brain-dump.ts            ← localStorage helpers
  types/
    brain-dump.ts            ← BrainDumpEntry type
```

---

## Out of Scope (for this version)

- Canvas pan / infinite scroll
- Edit-in-place for sticky note text
- Search or filter entries
- Tags or categories
- Sharing or export
- Sync across devices
