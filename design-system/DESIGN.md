# LVL3 Portal — Design System

**OLED Dark + Blue/Amber theme** — body background #020617 (deep navy), cards #0F172A, primary text #F1F5F9 (slate white).

## Key CSS variables
```css
--background: #020617        /* body */
--foreground: #F1F5F9        /* primary text */
--color-card: #0F172A        /* card bg */
--color-accent: #F59E0B      /* amber accent — buttons, active states, KPI numbers */
--color-primary: #3B82F6     /* blue — interactive, links, eyebrow labels */
--color-muted: #64748B       /* secondary text */
--color-border: #1E293B      /* borders */

/* Topbar (dark) */
--nav-bg: #0F172A
--nav-text: #94A3B8

/* Sidebar (OLED dark) */
--sidebar-bg: #020617
--sidebar-active: #F59E0B
```

## Tailwind color tokens
- `surface-950/900/850/800` — backgrounds (darkest → card)
- `surface-700/600` — borders
- `surface-500/400/300/200/100` — text (muted → primary)
- `brand-400` — amber (#F59E0B) — primary accent
- `brand-700` — deep amber (#92400E)
- `accent-400` — blue (#3B82F6) — primary interactive
- `accent-500` — blue (#2563EB)

## Typography
- Body: Fira Sans (`var(--font-fira-sans)`)
- Headings (h1-h6): Fira Code (`var(--font-fira-code)`) — bold monospace
- Eyebrow labels: `.eyebrow` utility class — 11px, 500 weight, 0.14em tracking, uppercase, `--color-primary`

## Component conventions
- Cards: `bg-surface-900 border border-surface-700 rounded-xl`
- Input fields: `bg-surface-800 border border-surface-600 text-surface-100 rounded-lg px-3 py-2`
- KPI numbers: `style={{ color: 'var(--color-accent)' }}`
- Primary buttons: `bg-blue-600 hover:bg-blue-500 text-surface-100`
- Section headings in cards: `text-surface-100 font-semibold text-sm uppercase tracking-wide`

## Chart conventions
- Tooltip bg: `#0F172A`, border: `#283548`
- Axis ticks: `#94A3B8`
- Grid lines: `#283548`
- Label text: `#CBD5E1`
