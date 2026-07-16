---
name: Obsidian Glass
colors:
  surface: '#13131a'
  surface-dim: '#13131a'
  surface-bright: '#393841'
  surface-container-lowest: '#0e0e15'
  surface-container-low: '#1b1b22'
  surface-container: '#1f1f26'
  surface-container-high: '#2a2931'
  surface-container-highest: '#34343c'
  on-surface: '#e4e1ec'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e4e1ec'
  inverse-on-surface: '#303038'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#c4c1fb'
  on-secondary: '#2d2a5b'
  secondary-container: '#444173'
  on-secondary-container: '#b3afe9'
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
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c4c1fb'
  on-secondary-fixed: '#181445'
  on-secondary-fixed-variant: '#444173'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#13131a'
  on-background: '#e4e1ec'
  surface-variant: '#34343c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  margin: 32px
---

## Brand & Style

This design system is engineered for a sophisticated, high-performance desktop experience. The brand personality is technical yet elegant, evoking the feeling of a premium physical workstation translated into a digital environment. 

The aesthetic centers on **Glassmorphism** set against a deep, void-like backdrop. It utilizes semi-transparent layers, high-quality backdrop blurs (20px–40px), and micro-fine borders to create a sense of physical depth without traditional heavy shadows. The emotional response should be one of focus, precision, and futuristic luxury. The UI feels "expensive" through its restraint and the calculated use of vibrant purple accents against a monochromatic, low-light canvas.

## Colors

The palette is anchored by a deep obsidian background (`#0B0B12`) to maximize contrast for the glass elements. 

- **Primary:** A vibrant Violet (`#8B5CF6`) used exclusively for interactive states, progress indicators, and focal points.
- **Surface:** Surfaces are not solid colors but translucent layers of white at low opacities (4%–8%) to allow background colors or gradients to bleed through.
- **Accents:** Secondary colors utilize deep indigos to provide subtle tonal shifts in nested containers.
- **Functional:** Success, warning, and error states should be desaturated to maintain the dark-mode harmony, using the primary purple as the dominant brand signal.

## Typography

This design system relies on **Inter** for its systematic, utilitarian, and clean characteristics. 

The typographic hierarchy is built on tight leading and slight negative letter-spacing for large displays to maintain a compact, "pro-app" feel. Body text should primarily use a "Medium Grey" (approx. 80% opacity white) to reduce eye strain against the dark background, while headlines use pure white for maximum legibility. Labels use a slight tracking increase and uppercase styling to differentiate functional metadata from narrative content.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for desktop workflows. It utilizes a 12-column system where the density is prioritized. 

- **Rhythm:** A 4px baseline grid governs all spatial relationships.
- **Margins:** Large outer margins (32px) provide breathing room for the glass panels, preventing the UI from feeling cramped.
- **Gutters:** Consistent 20px gutters ensure that the light-refracting borders of adjacent glass cards remain distinct.
- **Reflow:** On smaller viewports, the 12-column grid collapses to 4 columns, and the glass transparency is slightly reduced (increased opacity) to maintain legibility on smaller glass-on-glass stacks.

## Elevation & Depth

Depth is communicated through **Optical Stacking** rather than traditional drop shadows.

1.  **Backdrop Blur:** Every elevated surface must apply a `backdrop-filter: blur(24px)`.
2.  **Inner Glow:** To simulate glass thickness, elements use a 1px internal border (`rgba(255,255,255,0.08)`) which acts as a "specular highlight" on the top and left edges.
3.  **Purple Bloom:** High-priority elements (like active buttons) emit a soft, diffused outer glow using the primary purple (`#8B5CF6`) with a 20% opacity and 30px spread.
4.  **Z-Index Logic:** As elements rise in the Z-axis, their background opacity increases slightly, and the blur intensity increases, simulating a shorter distance to the user.

## Shapes

The shape language is consistently **Rounded** (12px / 0.75rem). 

- **Standard Containers:** Use the base 12px radius.
- **Large Cards:** Use `rounded-lg` (16px) to create a nested appearance where internal components (12px) sit comfortably inside.
- **Interactive Triggers:** Small buttons or chips may use the base 12px or full pill-shape if they are standalone icons.
- **Borders:** All borders are kept at a constant 1px width to maintain a technical, sharp edge that defines the glass boundaries against the dark background.

## Components

- **Buttons:** Primary buttons use a solid-to-gradient purple fill. Secondary buttons are "Ghost Glass"—transparent with a 1px white border at 10% opacity.
- **Input Fields:** Darker than the surface (`rgba(0,0,0,0.2)`) with a subtle 1px bottom border that illuminates to purple on focus.
- **Cards:** The signature component. Must feature the 24px backdrop blur and the 1px subtle white border. 
- **Chips/Tags:** Small, pill-shaped elements with a secondary indigo background (`#1E1B4B`) and white text.
- **Lists:** Items are separated by low-opacity lines; hover states trigger a slight "lift" effect where the background opacity of the row increases to 10%.
- **Scrollbars:** Custom slim, dark-grey tracks with purple thumbs to maintain the "pro" aesthetic.
- **Modals:** High-intensity blur (40px) on the background overlay to isolate the user's focus on the central glass panel.