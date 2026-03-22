# Drift — Design System
**Version:** 1.0
**Stack:** Next.js · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion
**Last Updated:** March 2026

---

## 1. Design Philosophy

### The Metaphor
Drift is the experience of floating on a calm open sea at early morning — when the water is still, the light is soft, and the world feels manageable. Every design decision should reinforce this feeling: **calm, deep, alive, and unhurried.**

### Core Principles

| Principle | What it means in practice |
|---|---|
| **Calm over stimulating** | No red badges. No notification counts. No aggressive CTAs. |
| **Breathable over dense** | Generous whitespace. Let content breathe. |
| **Opinionated over neutral** | Drift has a point of view. The UI reflects that. |
| **Alive over static** | Subtle motion everywhere. The interface should feel like it's gently breathing. |
| **Done states matter** | Every flow ends with intention. Completion feels satisfying. |

---

## 2. Color System

### Philosophy
Not dark for darkness' sake — deep for depth. Like looking into clear ocean water. Rich, layered, and full of quiet light.

### Base Palette

```css
:root {
  /* Backgrounds — layered depth like ocean water */
  --color-bg-base:        #0A2535;   /* Deepest layer — page background */
  --color-bg-surface:     #0D2F3F;   /* Cards, panels */
  --color-bg-elevated:    #113548;   /* Hover states, modals, dropdowns */
  --color-bg-overlay:     #163D52;   /* Tooltips, popovers */

  /* Accent — Bioluminescent teal, the light in the water */
  --color-accent-primary:  #4DD9C0;  /* Primary CTA, active states, glow */
  --color-accent-soft:     #38BFA1;  /* Secondary accent, tags */
  --color-accent-muted:    #2A8C78;  /* Borders, subtle highlights */
  --color-accent-glow:     rgba(77, 217, 192, 0.15); /* Glow halos */

  /* Signal colors — used sparingly, like buoys in the water */
  --color-signal-gold:     #E8C97A;  /* Important / high relevance */
  --color-signal-amber:    #D4A84B;  /* Warning / not yet */
  --color-signal-muted:    #6B8B9A;  /* Skip / low relevance */
  --color-signal-positive: #4DD9C0;  /* Yes / confirmed */

  /* Text */
  --color-text-primary:    #E8F4F1;  /* Main body text */
  --color-text-secondary:  #8BAFC0;  /* Supporting text, labels */
  --color-text-tertiary:   #527A8A;  /* Placeholders, disabled */
  --color-text-inverse:    #0A2535;  /* Text on light/accent backgrounds */

  /* Borders */
  --color-border-subtle:   rgba(255, 255, 255, 0.06);
  --color-border-default:  rgba(255, 255, 255, 0.10);
  --color-border-strong:   rgba(77, 217, 192, 0.20);
  --color-border-accent:   rgba(77, 217, 192, 0.40);
}
```

### Tailwind Config Extension

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        drift: {
          base:     '#0A2535',
          surface:  '#0D2F3F',
          elevated: '#113548',
          overlay:  '#163D52',
          accent:   '#4DD9C0',
          'accent-soft':  '#38BFA1',
          'accent-muted': '#2A8C78',
          gold:     '#E8C97A',
          amber:    '#D4A84B',
          muted:    '#6B8B9A',
          'text-primary':   '#E8F4F1',
          'text-secondary': '#8BAFC0',
          'text-tertiary':  '#527A8A',
        }
      }
    }
  }
}
```

### Color Usage Rules
- **`--color-bg-base`** — page background only. Never use for cards.
- **`--color-accent-primary`** — one dominant accent per screen. Don't scatter it.
- **`--color-signal-gold`** — reserved for high relevance scores (8+) and important signals only.
- **Never use pure `#000000` or `#FFFFFF`** anywhere in the product.
- **Opacity over new colors** — when you need a lighter variant, use opacity on an existing color.

---

## 3. Typography

### Font Stack

```css
/* Headings — Sora: geometric, wide, editorial */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

/* Body — Plus Jakarta Sans: humanist, warm, readable */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

/* Mono — JetBrains Mono: technical, precise, developer-native */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');

:root {
  --font-heading: 'Sora', sans-serif;
  --font-body:    'Plus Jakarta Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

### Type Scale

```css
/* Display — hero moments, done states */
.text-display {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* Heading 1 — screen titles */
.text-h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;   /* 28px */
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

/* Heading 2 — section titles, card headers */
.text-h2 {
  font-family: var(--font-heading);
  font-size: 1.25rem;   /* 20px */
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
}

/* Heading 3 — sub-sections, labels */
.text-h3 {
  font-family: var(--font-heading);
  font-size: 1rem;      /* 16px */
  font-weight: 500;
  line-height: 1.4;
}

/* Body — primary reading text */
.text-body {
  font-family: var(--font-body);
  font-size: 0.9375rem; /* 15px */
  font-weight: 400;
  line-height: 1.65;
}

/* Body small — supporting text, card summaries */
.text-body-sm {
  font-family: var(--font-body);
  font-size: 0.8125rem; /* 13px */
  font-weight: 400;
  line-height: 1.6;
}

/* Label — tags, chips, nav labels */
.text-label {
  font-family: var(--font-body);
  font-size: 0.75rem;   /* 12px */
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* Mono — scores, versions, data points */
.text-mono {
  font-family: var(--font-mono);
  font-size: 0.875rem;  /* 14px */
  font-weight: 400;
  line-height: 1;
}

/* Mono large — relevance scores, big numbers */
.text-mono-lg {
  font-family: var(--font-mono);
  font-size: 1.5rem;    /* 24px */
  font-weight: 500;
  line-height: 1;
}
```

### Tailwind Typography Classes

```ts
// In tailwind.config.ts — extend with custom text styles
fontSize: {
  'display': ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
  'h1':      ['1.75rem',   { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
  'h2':      ['1.25rem',   { lineHeight: '1.3',  letterSpacing: '-0.005em' }],
  'h3':      ['1rem',      { lineHeight: '1.4' }],
  'body':    ['0.9375rem', { lineHeight: '1.65' }],
  'body-sm': ['0.8125rem', { lineHeight: '1.6' }],
  'label':   ['0.75rem',   { lineHeight: '1',    letterSpacing: '0.03em' }],
}
```

---

## 4. Spacing System

Using an 4px base grid. All spacing values are multiples of 4.

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Layout Spacing Rules
- **Card internal padding:** `24px` (space-6)
- **Card gap in digest list:** `12px` (space-3)
- **Section spacing:** `48px` (space-12)
- **Page horizontal padding:** `16px` mobile / `24px` tablet / `32px` desktop
- **Max content width:** `680px` centered

---

## 5. Elevation & Surfaces

Three layers of depth — like looking through clear water.

```css
/* Layer 0 — Page base */
.surface-base {
  background: var(--color-bg-base);
}

/* Layer 1 — Cards, panels */
.surface-card {
  background: var(--color-bg-surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
}

/* Layer 2 — Elevated cards, modals */
.surface-elevated {
  background: var(--color-bg-elevated);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-border-default);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
}

/* Layer 3 — Overlays, dropdowns */
.surface-overlay {
  background: var(--color-bg-overlay);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.32),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

/* Accent glow — applied to active/important cards */
.surface-glow {
  box-shadow:
    0 0 0 1px var(--color-border-accent),
    0 0 24px var(--color-accent-glow),
    0 8px 32px rgba(0, 0, 0, 0.20);
}
```

---

## 6. Component Library

### 6.1 Cards

Cards are the primary UI primitive. Each card type has a unique layout signature but shares the same base surface.

#### Base Card

```tsx
// components/ui/drift-card.tsx
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DriftCardProps {
  children: React.ReactNode
  className?: string
  glowing?: boolean
  onClick?: () => void
}

export function DriftCard({ children, className, glowing, onClick }: DriftCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -2 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-drift-surface',
        'backdrop-blur-xl p-6',
        'transition-all duration-300',
        'hover:border-white/[0.10] hover:bg-drift-elevated',
        glowing && 'border-drift-accent/40 shadow-[0_0_24px_rgba(77,217,192,0.12)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
```

#### Relevance Score Badge

```tsx
// components/ui/relevance-score.tsx
interface RelevanceScoreProps {
  score: number  // 1–10
}

export function RelevanceScore({ score }: RelevanceScoreProps) {
  const color = score >= 8
    ? 'text-drift-gold shadow-[0_0_12px_rgba(232,201,122,0.3)]'
    : score >= 5
    ? 'text-drift-accent shadow-[0_0_12px_rgba(77,217,192,0.2)]'
    : 'text-drift-muted'

  return (
    <div className={cn(
      'font-mono text-mono-lg font-medium tabular-nums',
      'w-10 h-10 rounded-full flex items-center justify-center',
      'border border-white/10 bg-white/5',
      color
    )}>
      {score}
    </div>
  )
}
```

#### Card Type Signatures

```tsx
// Tool Release Card — version badge + changelog feel
<DriftCard>
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-2">
      <SourceIcon />
      <span className="text-label text-drift-text-secondary">TOOL RELEASE</span>
    </div>
    <RelevanceScore score={9} />
  </div>
  <h2 className="text-h2 text-drift-text-primary mb-1">Vercel AI SDK 4.0</h2>
  <VersionBadge from="3.4.1" to="4.0.0" />
  <p className="text-body-sm text-drift-text-secondary mt-3">...</p>
  <CardActions />
</DriftCard>

// Article Card — reading-focused, clean
<DriftCard>
  <div className="flex items-start gap-4">
    <div className="flex-1">
      <SourceTag />
      <h2 className="text-h2 mt-2">...</h2>
      <p className="text-body-sm text-drift-text-secondary mt-2">...</p>
      <ReadTime minutes={5} />
    </div>
    <RelevanceScore score={7} />
  </div>
  <CardActions />
</DriftCard>

// Video Card — topic-focused, timestamp highlights
<DriftCard>
  <div className="flex items-start gap-4">
    <VideoThumbnail />
    <div className="flex-1">
      <SourceTag platform="YouTube" />
      <h2 className="text-h2 mt-1">...</h2>
      <p className="text-body-sm mt-2">...</p>
      <TimestampList items={[...]} />
    </div>
  </div>
  <RelevanceScore score={6} />
  <CardActions />
</DriftCard>
```

---

### 6.2 Verdict Component

Used in "Should I Learn This?" — opinionated, bold, structured.

```tsx
// components/ui/verdict-card.tsx
type VerdictType = 'YES' | 'NOT_YET' | 'SKIP'

const verdictStyles: Record<VerdictType, string> = {
  YES:     'text-drift-accent border-drift-accent/40 shadow-[0_0_32px_rgba(77,217,192,0.2)]',
  NOT_YET: 'text-drift-gold  border-drift-gold/40  shadow-[0_0_32px_rgba(232,201,122,0.2)]',
  SKIP:    'text-drift-muted border-white/10',
}

const verdictLabel: Record<VerdictType, string> = {
  YES:     'YES',
  NOT_YET: 'NOT YET',
  SKIP:    'SKIP',
}

interface VerdictCardProps {
  verdict: VerdictType
  forYou: string
  caseFor: string
  caseAgainst: string
  alternative?: string
  confidence: 'High' | 'Medium'
}

export function VerdictCard({ verdict, forYou, caseFor, caseAgainst, alternative, confidence }: VerdictCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Verdict headline */}
      <div className={cn(
        'rounded-2xl border p-6',
        'flex items-center justify-between',
        verdictStyles[verdict]
      )}>
        <span className="font-heading text-display font-semibold tracking-tight">
          {verdictLabel[verdict]}
        </span>
        <ConfidenceBadge level={confidence} />
      </div>

      {/* Breakdown rows */}
      <VerdictRow label="For you" content={forYou} />
      <VerdictRow label="The case for" content={caseFor} />
      <VerdictRow label="The case against" content={caseAgainst} />
      {alternative && <VerdictRow label="Better alternative" content={alternative} highlight />}
    </motion.div>
  )
}
```

---

### 6.3 Link Drop Input

The persistent bottom input. Calm when idle, alive when active.

```tsx
// components/ui/link-drop.tsx
export function LinkDropInput() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <motion.div
      animate={{
        boxShadow: focused
          ? '0 0 0 1px rgba(77,217,192,0.4), 0 0 24px rgba(77,217,192,0.12)'
          : '0 0 0 1px rgba(255,255,255,0.06)'
      }}
      className="rounded-2xl bg-drift-surface backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <LinkIcon className="w-4 h-4 text-drift-text-tertiary shrink-0" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Drop a link to assess its relevance..."
          className="flex-1 bg-transparent text-body text-drift-text-primary
                     placeholder:text-drift-text-tertiary outline-none"
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-label text-drift-accent px-3 py-1.5
                         rounded-lg bg-drift-accent/10 hover:bg-drift-accent/20
                         transition-colors"
            >
              Assess
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
```

---

### 6.4 Tags & Chips

```tsx
// Relevance chip — why this was surfaced
<span className="inline-flex items-center gap-1.5 px-2.5 py-1
                 rounded-full bg-drift-accent/10 border border-drift-accent/20
                 text-label text-drift-accent">
  Matches your Next.js stack
</span>

// Stack tag — user's technologies
<span className="inline-flex items-center px-2.5 py-1
                 rounded-full bg-white/5 border border-white/10
                 text-label text-drift-text-secondary">
  Next.js
</span>

// Effort badge — workflow profiler recommendations
<span className="inline-flex items-center gap-1 px-2.5 py-1
                 rounded-full bg-drift-gold/10 border border-drift-gold/20
                 text-label text-drift-gold">
  ⚡ Quick Win
</span>
```

---

### 6.5 Buttons

```tsx
// Primary — glowing teal, main CTAs
<button className="px-6 py-3 rounded-xl
                   bg-drift-accent text-drift-base
                   font-body font-semibold text-body
                   shadow-[0_0_20px_rgba(77,217,192,0.25)]
                   hover:shadow-[0_0_28px_rgba(77,217,192,0.40)]
                   hover:bg-drift-accent-soft
                   transition-all duration-300 active:scale-[0.98]">
  Continue
</button>

// Ghost — secondary actions
<button className="px-6 py-3 rounded-xl
                   border border-white/10 bg-transparent
                   text-drift-text-secondary font-body text-body
                   hover:border-white/20 hover:text-drift-text-primary
                   hover:bg-white/5 transition-all duration-300">
  Skip
</button>

// Icon — card actions
<button className="w-8 h-8 rounded-lg flex items-center justify-center
                   text-drift-text-tertiary
                   hover:text-drift-accent hover:bg-drift-accent/10
                   transition-all duration-200">
  <BookmarkIcon className="w-4 h-4" />
</button>
```

---

### 6.6 Navigation

```tsx
// Bottom navigation (mobile + default)
const navItems = [
  { icon: HomeIcon,     label: 'Today',   href: '/' },
  { icon: SparkleIcon,  label: 'Ask',     href: '/ask' },
  { icon: LinkIcon,     label: 'Drop',    href: '/drop' },
  { icon: UserIcon,     label: 'Profile', href: '/profile' },
]

// Active state: teal text + bottom glow bar
// Inactive state: muted text, no indicator
```

---

## 7. Motion System

### Easing Curves

```ts
export const easings = {
  // Smooth deceleration — most UI transitions
  smooth:   [0.25, 0.46, 0.45, 0.94],
  // Spring-like — card interactions
  spring:   [0.34, 1.56, 0.64, 1],
  // Gentle — background, ambient animations
  gentle:   [0.4, 0, 0.2, 1],
  // Sharp out — quick dismissals
  sharpOut: [0.55, 0, 1, 0.45],
}
```

### Animation Variants

```ts
// Framer Motion variants — use these consistently across the app

export const fadeUp = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: easings.smooth }
}

export const staggerChildren = {
  animate: {
    transition: { staggerChildren: 0.08 }
  }
}

export const cardReveal = {
  initial:  { opacity: 0, y: 24, scale: 0.98 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  transition: { duration: 0.4, ease: easings.smooth }
}

export const streamIn = {
  // For streaming text — words appear left to right
  initial:  { opacity: 0, filter: 'blur(4px)' },
  animate:  { opacity: 1, filter: 'blur(0px)' },
  transition: { duration: 0.2, ease: easings.gentle }
}

export const pageFade = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: 0.3, ease: easings.gentle }
}
```

### Motion Rules

| Rule | Detail |
|---|---|
| **Page transitions** | Soft fade only (`pageFade`). No slides, no scales. |
| **Card entry** | Staggered `cardReveal` on digest load. 80ms between cards. |
| **Hover** | Scale `1.005` + `y: -2` + shadow increase. Slow and gentle (250ms). |
| **Streaming text** | Word-by-word `streamIn` blur fade. Feels like thought appearing. |
| **Done state** | Cards fade out one by one, then done state fades in. |
| **No snap animations** | Nothing should feel abrupt. If it snaps, slow it down. |
| **Background** | Subtle slow-moving gradient. 15–20s loop. CSS animation only. |

---

## 8. Background & Atmosphere

The background is alive — like water catching light.

```css
/* Base atmospheric background */
.drift-bg {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(77, 217, 192, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(13, 47, 63, 0.8) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(10, 37, 53, 0.9) 0%, transparent 60%),
    #0A2535;
  min-height: 100vh;
}

/* Slow ambient gradient animation */
@keyframes drift-ambient {
  0%, 100% {
    background-position: 0% 50%;
    opacity: 0.6;
  }
  50% {
    background-position: 100% 50%;
    opacity: 0.8;
  }
}

.drift-bg::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    rgba(77, 217, 192, 0.05) 0%,
    transparent 70%
  );
  animation: drift-ambient 18s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

/* Subtle noise texture for depth */
.drift-noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* SVG noise */
  opacity: 0.025;
  pointer-events: none;
  z-index: 1;
}
```

---

## 9. shadcn/ui Theming

Override shadcn tokens to match Drift's palette in `globals.css`:

```css
@layer base {
  :root {
    --background:         10 37% 12%;    /* drift-base */
    --foreground:         180 40% 93%;   /* drift-text-primary */
    --card:               200 48% 15%;   /* drift-surface */
    --card-foreground:    180 40% 93%;
    --popover:            200 50% 17%;   /* drift-elevated */
    --popover-foreground: 180 40% 93%;
    --primary:            170 62% 58%;   /* drift-accent */
    --primary-foreground: 10 37% 12%;
    --secondary:          200 35% 22%;
    --secondary-foreground: 180 40% 75%;
    --muted:              200 30% 20%;
    --muted-foreground:   200 25% 55%;   /* drift-text-secondary */
    --accent:             170 62% 58%;
    --accent-foreground:  10 37% 12%;
    --border:             200 25% 20%;
    --input:              200 30% 18%;
    --ring:               170 62% 58%;
    --radius:             1rem;          /* 16px — rounded-2xl default */
  }
}
```

---

## 10. Iconography

Use **Lucide React** (ships with shadcn). Consistent sizing:

```tsx
// Sizes
// Navigation:  w-5 h-5 (20px)
// Card actions: w-4 h-4 (16px)
// Inline:      w-3.5 h-3.5 (14px)

// Color
// Default:   text-drift-text-tertiary
// Hover:     text-drift-accent
// Active:    text-drift-accent

// Stroke width: always strokeWidth={1.5} — never the default 2
```

---

## 11. Responsive Breakpoints

```ts
// tailwind.config.ts
screens: {
  'sm':  '640px',   // Large mobile
  'md':  '768px',   // Tablet
  'lg':  '1024px',  // Desktop
  'xl':  '1280px',  // Wide desktop
}

// Layout behavior
// < 768px:  Bottom navigation, single column, full-width cards
// ≥ 768px:  Left sidebar navigation (collapsed), max-w-[680px] centered content
// ≥ 1280px: Left sidebar (expanded with labels), content + right context panel
```

---

## 12. Content Width & Grid

```tsx
// Page wrapper — all screens use this
<div className="min-h-screen bg-drift-base">
  <div className="mx-auto max-w-[680px] px-4 md:px-6 py-6 md:py-10">
    {/* Screen content */}
  </div>
</div>
```

---

## 13. Done State

The emotional peak of the product. Deserves full-screen treatment.

```tsx
// screens/done-state.tsx
export function DoneState({ summary }: { summary: string }) {
  return (
    <motion.div
      {...pageFade}
      className="fixed inset-0 flex flex-col items-center justify-center
                 bg-drift-base text-center px-8"
    >
      {/* Subtle horizon illustration — SVG wave lines */}
      <HorizonIllustration className="mb-12 opacity-40" />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-label text-drift-accent mb-4 tracking-widest"
      >
        YOU'RE ALL CAUGHT UP
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-display text-drift-text-primary mb-6 max-w-sm"
      >
        Today's signal, delivered.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-body text-drift-text-secondary max-w-xs"
      >
        {summary}
      </motion.p>
    </motion.div>
  )
}
```

---

## 14. File Structure

```
src/
├── app/
│   ├── (onboarding)/
│   │   ├── stack/page.tsx
│   │   ├── context/page.tsx
│   │   └── profiler/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← Nav + shell
│   │   ├── page.tsx            ← Home / Daily Digest
│   │   ├── ask/page.tsx        ← Should I learn this?
│   │   ├── drop/page.tsx       ← Link drop expanded
│   │   └── profile/page.tsx
│   └── globals.css
├── components/
│   ├── ui/                     ← shadcn + Drift primitives
│   │   ├── drift-card.tsx
│   │   ├── relevance-score.tsx
│   │   ├── verdict-card.tsx
│   │   ├── link-drop.tsx
│   │   └── ...
│   ├── cards/                  ← Generative card types
│   │   ├── tool-release-card.tsx
│   │   ├── article-card.tsx
│   │   ├── video-card.tsx
│   │   └── repo-card.tsx
│   ├── digest/
│   ├── ask/
│   └── profile/
├── lib/
│   ├── claude.ts               ← API client + streaming
│   ├── prompts.ts              ← All Claude prompts
│   └── utils.ts
├── hooks/
│   ├── use-profile.ts
│   ├── use-digest.ts
│   └── use-streaming.ts
└── types/
    ├── profile.ts
    ├── digest.ts
    └── verdict.ts
```

---

*Drift Design System v1.0 — Calm intelligence, beautifully rendered.*
