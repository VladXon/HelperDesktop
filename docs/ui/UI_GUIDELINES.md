# UI Guidelines

**Dark theme only. CSS custom properties on `:root` + Tailwind aliases.**

## Colors

| Token | Tailwind | Value |
|---|---|---|
| `--bg-primary` | `bg-bg-primary` | `#131315` |
| `--bg-secondary` | `bg-bg-secondary` | `#1c1b1d` |
| `--bg-sidebar` | `bg-bg-sidebar` | `rgba(14,14,16,0.92)` |
| `--text-primary` | `text-text-primary` | `#e5e1e4` |
| `--text-secondary` | `text-text-secondary` | `#cbc3d7` |
| `--text-muted` | `text-text-muted` | `#958ea0` |
| `--primary` | `text-primary` / `bg-primary` | `#d0bcff` |
| `--primary-container` | `text-primary-container` / `bg-primary-container` | `#a078ff` |
| `--accent` | `bg-accent` / `text-accent` / `border-accent` | `#8b5cf6` |
| `--accent-hover` | `bg-accent-hover` | `#7c3aed` |
| `--border` | `border-border` | `rgba(255,255,255,0.08)` |

## Typography
- Font: Inter, system-ui, sans-serif; Mono: Inter, monospace
- Sizes: `text-headline-lg` (28px, 700), `text-headline-md` (20px, 600), `text-body-md` (14px, 400), `text-label-sm` (12px, 500), `text-xs`, `text-sm`, `text-base`, `text-lg`

## Glassmorphism
- Cards: `bg-white/[0.03] backdrop-blur-xl rounded-lg border border-white/10`
- Dialogs: `bg-white/[0.04] backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]`
- Sidebar/Titlebar: `bg-surface-container-lowest/40 backdrop-blur-2xl`
- Search: `bg-white/5 backdrop-blur-md`

## Spacing
- Page padding: `p-container_padding` (32px)
- Grid gap: `gap-gutter` (16px)
- Section stacking: `space-y-stack_gap` (24px)

## Page Layout
```
div.flex.h-screen.w-screen.flex-col
├── Titlebar (h-14, bg-sidebar glass)
└── div.flex.flex-1
    ├── Sidebar (w-sidebar_width, 240px, bg-sidebar glass)
    └── main.flex-1
        └── Page content (notes/presets/settings)
```

## Component Conventions
- `cn()` from `lib/utils.ts` for class merging
- Icons: `@phosphor-icons/react`, size `16` standard, `14` small, `20` large
- Transitions: `transition-all` for buttons/inputs, `transition-colors` for badges/links
- Form: `flex flex-col gap-1.5` per field, label `text-label-sm`, error `text-xs text-red-400`
- Z-index: orbs `0`, content `10`, sidebar `40`, overlays `50`, inspector `60`

## Key Component Patterns
- **Button**: CVA with variants `default|accent|outline|secondary|ghost|destructive|link`, sizes `default|sm|lg|icon`
- **Input**: `flex h-9 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm` with accent focus ring
- **Badge**: CVA variants `default|secondary|outline|accent`
- **Switch**: `h-5 w-9 rounded-full`, thumb `h-4 w-4`
- **Dialog**: Radix Dialog — overlay `bg-black/60 backdrop-blur-sm`, content glass with `p-6 max-w-lg`
- **DropdownMenu**: `bg-bg-secondary border border-border p-1 rounded-md shadow-md`

## Design Philosophy

Obsidian Glass design system — a sophisticated fusion of deep obsidian backgrounds and glassmorphism translucency. Targets tech-savvy power users requiring focused, low-fatigue workspaces.

### Elevation & Depth
Depth is communicated through optical stacking rather than traditional shadows:
- **Level 0 (Background):** Solid `#131315`
- **Level 1 (Sidebar/Cards):** backdrop-blur (20-24px) + 3-4% white fill + 1px border (white 8-10%)
- **Level 2 (Inputs/Popovers):** backdrop-blur (40px) + 6% white fill + 1px border (white 15%)
- **Purple Bloom:** Active elements feature primary violet glow for edge-lighting effect

### Shapes
- Standard containers: `rounded-lg` (12px / 0.75rem)
- Large cards: 16px radius
- Interactive triggers: 12px or full pill for standalone icons
- All borders: constant 1px width
