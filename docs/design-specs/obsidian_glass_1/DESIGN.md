---
name: Obsidian Glass
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#ccbeff'
  on-secondary: '#332664'
  secondary-container: '#4a3d7c'
  on-secondary-container: '#baabf3'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbeff'
  on-secondary-fixed: '#1e0e4e'
  on-secondary-fixed-variant: '#4a3d7c'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 240px
  container_padding: 32px
  gutter: 16px
  stack_gap: 24px
  item_gap: 8px
---

## Brand & Style

The design system is a sophisticated fusion of "Obsidian" depth and "Glassmorphism" translucency. It targets tech-savvy power users, developers, and researchers who require a focused, low-fatigue workspace that feels both futuristic and grounded. 

The aesthetic is defined by:
- **Obsidian Foundations:** Deep, near-black backgrounds that provide maximum contrast for violet accents.
- **Atmospheric Depth:** Multi-layered glass surfaces with varying degrees of `backdrop-blur` and `saturate` filters to create a sense of physical space.
- **Subtle Radiance:** Inner glows and sharp, 1px semi-transparent borders simulate light catching the edge of a glass pane.
- **Precision:** A clean, flat UI approach that avoids heavy drop shadows in favor of tonal elevation and refraction.

## Colors

This design system utilizes a restricted "Midnight & Ultraviolet" palette. 

- **Primary Violet (#8b5cf6):** Used for primary actions, active states, and focus indicators.
- **Secondary Lavender (#c4b5fd):** Used for subtle accents and hovered states of primary elements.
- **Obsidian Neutral (#0a0a0c):** The base canvas color, ensuring true blacks for OLED screens while maintaining enough depth for glass layering.
- **Glass Logic:** Surfaces are built using translucent white or primary-tinted overlays (3-8% opacity) rather than solid grays, allowing the background to bleed through softly.

## Typography

The typography is strictly utilitarian and modern, leveraging **Inter** for its exceptional legibility in dark interfaces. 

- **Headlines:** Use a tighter letter-spacing and heavier weights to command attention against dark backgrounds.
- **Body:** Standardized at 14px for density, ensuring complex settings pages remain scannable.
- **Labels:** Small caps or medium weights are used for form labels and navigation items to distinguish them from content.
- **Contrast:** High-priority text uses White (#FFFFFF), while secondary info uses a muted "Ghost White" (rgba(255, 255, 255, 0.6)).

## Layout & Spacing

The layout maintains a classic three-zone desktop architecture:
1. **Global Sidebar:** A high-blur glass panel on the left for primary navigation.
2. **Utility Header:** A thin, translucent bar for search and status.
3. **Main Canvas:** A spacious area for content, utilizing a fixed-width container for forms to maintain readability.

Spacing follows an 8px rhythmic grid. Internal margins for glass cards should be generous (24px - 32px) to prevent content from feeling crowded against the refractive edges.

## Elevation & Depth

Depth is communicated through **Refractive Stacking** rather than shadows:
- **Level 0 (Background):** Solid #0a0a0c.
- **Level 1 (Sidebar/Cards):** Background blur (20px) + 3% white fill + 1px border (white 10%).
- **Level 2 (Inputs/Popovers):** Background blur (40px) + 6% white fill + 1px border (white 15%).
- **Inner Glow:** Active elements feature a 1px inner stroke (inset shadow) of the primary violet at 30% opacity to simulate edge-lighting.

## Shapes

The design system adheres to a consistent **0.5rem (8px)** corner radius for all primary containers, buttons, and input fields. 

- **Outer Containers:** 8px radius.
- **Nested Elements:** When an element is nested within a card, its radius should be reduced to 4px to maintain visual concentricity.
- **Active Indicators:** Vertical pills in the sidebar use a fully rounded (pill) shape on the leading edge only.

## Components

### Buttons
- **Primary:** Solid #8b5cf6 with white text. No gradient, but a 1px top-edge highlight (white 20%).
- **Secondary/Ghost:** Border of 1px (white 10%) with a glass hover state (white 5% fill).
- **Icon Buttons:** Simple glyphs that shift from 60% to 100% opacity on hover.

### Input Fields
- **Default:** Dark glass background (rgba(0,0,0,0.2)) with a 1px border (white 10%).
- **Focus:** Border color shifts to #8b5cf6 with a subtle outer glow (0px 0px 8px rgba(139, 92, 246, 0.3)).

### Sidebar Navigation
- Items use a transparent background by default. 
- **Active State:** A glass container background with a 2px vertical "light-pipe" indicator in primary violet on the far left.

### Cards & Sections
- Horizontal dividers should be 1px lines using white at 5% opacity.
- Collapsible headers use the "Label-SM" typography style with a subtle chevron icon.