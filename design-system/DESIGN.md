# LVL3 Portal — Design System

**Zinc + Violet** — modern, sleek dark theme. Near-black zinc backgrounds, violet accent, Inter + JetBrains Mono typography.

## Architecture

All design tokens live as **CSS custom properties** in `app/globals.css`. Tailwind config and chart components reference these variables — change colors in one place and everything updates.

- **`app/globals.css`** — single source of truth for all color/chart/nav tokens
- **`tailwind.config.ts`** — references CSS variables (supports opacity modifiers)
- **`app/layout.tsx`** — Google Font imports (Inter + JetBrains Mono)

## Color scales (RGB channels in globals.css)

### Surface (zinc neutrals)
| Token | Hex | Usage |
|-------|-----|-------|
| `--surface-950` | #09090B | Body background |
| `--surface-900` | #18181B | Card / panel bg |
| `--surface-850` | #1F1F23 | Card hover |
| `--surface-800` | #27272A | Input bg / elevated surface |
| `--surface-700` | #3F3F46 | Borders |
| `--surface-600` | #52525B | Border hover |
| `--surface-500` | #71717A | Placeholder / disabled |
| `--surface-400` | #A1A1AA | Muted text |
| `--surface-300` | #D4D4D8 | Secondary text |
| `--surface-200` | #E4E4E7 | Lighter text |
| `--surface-100` | #FAFAFA | Primary text |

### Brand (violet)
| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-400` | #A78BFA | Main accent — KPI numbers, active states, chart lines |
| `--brand-500` | #8B5CF6 | Interactive — buttons, links, eyebrow labels |
| `--brand-600` | #7C3AED | Button hover |
| `--brand-700` | #6D28D9 | Deep violet |

## Semantic aliases
```css
--background:    rgb(var(--surface-950))
--foreground:    rgb(var(--surface-100))
--color-card:    rgb(var(--surface-900))
--color-accent:  rgb(var(--brand-400))
--color-primary: rgb(var(--brand-500))
--color-muted:   rgb(var(--surface-400))
--color-border:  rgb(var(--surface-800))
```

## Chart tokens
```css
--chart-tooltip-bg:     rgb(var(--surface-900))
--chart-tooltip-border: rgb(var(--surface-700))
--chart-grid:           rgb(var(--surface-700))
--chart-tick:           rgb(var(--surface-400))
--chart-label:          rgb(var(--surface-300))
--chart-line:           rgb(var(--brand-400))
--chart-bar-secondary:  rgb(var(--surface-800))
```

## Active-state backgrounds
```css
--active-bg:      rgb(var(--brand-400) / 0.12)
--active-bg-bold: rgb(var(--brand-400) / 0.15)
```

## Tailwind color tokens
- `surface-950..100` — backgrounds through text (Tailwind classes: `bg-surface-900`, `text-surface-100`, etc.)
- `brand-50..900` — violet accent scale (`bg-brand-500`, `text-brand-400`, etc.)
- `accent-*` — mirrors brand scale for interactive elements
- All support opacity modifiers: `bg-surface-900/50`, `bg-brand-500/15`, etc.

## Typography
- Body: Inter (`var(--font-inter)`)
- Headings (h1-h6): JetBrains Mono (`var(--font-jetbrains-mono)`) — bold monospace
- Eyebrow labels: `.eyebrow` utility class — 11px, 500 weight, 0.14em tracking, uppercase, `--color-primary`

## Component conventions
- Cards: `bg-surface-900 border border-surface-700 rounded-xl`
- Input fields: `bg-surface-800 border border-surface-600 text-surface-100 rounded-lg px-3 py-2`
- KPI numbers: `style={{ color: 'var(--color-accent)' }}`
- Primary buttons: `bg-brand-500 hover:bg-brand-400 text-surface-100`
- Section headings in cards: `text-surface-100 font-semibold text-sm uppercase tracking-wide`

## Chart conventions
All chart components use CSS variable references — no hardcoded hex values.
```tsx
<CartesianGrid stroke="var(--chart-grid)" />
<XAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
<Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)' }} />
<Line stroke="var(--chart-line)" />
```

## How to change the palette
1. Edit `app/globals.css` — change RGB channel values in the `:root` block
2. Update this file (DESIGN.md) to document the new values
3. That's it — Tailwind classes, charts, nav, and sidebar all update automatically
