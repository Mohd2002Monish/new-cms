---
name: News Portal Editorial Design System
description: Modern Swiss Editorial and Digital Broadsheet design system for multilingual news publishing
colors:
  primary: "#111827"
  primary-light: "#1f2937"
  accent: "#c02626"
  accent-hover: "#991b1b"
  accent-light: "#fef2f2"
  neutral-bg: "#ffffff"
  neutral-bg-alt: "#f8f9fa"
  neutral-surface: "#ffffff"
  neutral-border: "#e5e7eb"
  neutral-text: "#111827"
  neutral-text-muted: "#4b5563"
  neutral-text-subtle: "#6b7280"
  breaking: "#dc2626"
  live: "#ea580c"
  warning: "#f59e0b"
  warning-light: "#fef3c7"
  success: "#059669"
  success-light: "#ecfdf5"
typography:
  display:
    fontFamily: "var(--font-serif), Merriweather, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-serif), Merriweather, Georgia, serif"
    fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-serif), Merriweather, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.025em"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  badge-brand:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  badge-breaking:
    backgroundColor: "{colors.breaking}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
---

## Overview

The **News Portal Editorial Design System** is rooted in **Swiss Modernism 2.0** and classic **digital broadsheet architecture**. Designed specifically for high-cadence digital journalism, it unites rigorous typographic order, mathematical spacing, and calm responsive hierarchy across English, Hindi (Devanagari), and Gujarati scripts.

The design embodies editorial authority: content takes sovereign precedence over decorative chrome. All motion is compositor-bound (zero layout reflows), visual affordances are unmistakable, and contrast strictly satisfies WCAG 2.2 AAA guidelines.

## Colors

The palette employs a **Committed Editorial** strategy: a deep ink primary for uncompromised typographic clarity, an editorial crimson accent for urgent reportage and breaking news, and warm-neutral paper surfaces that eliminate glare during prolonged reading.

### Core Semantic Roles

- **Ink Primary (`#111827`)**: The canonical color for headlines, lead titles, and primary reading text.
- **Editorial Crimson (`#c02626`)**: The signature newsroom accent. Applied deliberately to breaking badges, live coverage pulses, primary actions, and category markers.
- **Surface Clean (`#ffffff`) & Stage Tint (`#f8f9fa`)**: Clean background surface providing separation without harsh artificial borders.
- **Editorial Borders (`#e5e7eb` Light / `#374151` Dark)**: Subdued hairline dividers (1px) preserving modular structure without heavy visual noise.
- **Secondary Ink (`#4b5563` Light / `#9ca3af` Dark)**: Calibrated body metadata, timestamps, and captions hitting ≥5.5:1 contrast against surface backgrounds.

### Dark Mode Architecture

Under `[data-theme='dark']`, the portal translates to a deep nocturnal broadsheet rather than inverted neon grays:
- Surface: `#0e121b` with elevated panels at `#161c28`.
- Inks: `#f9fafb` (Primary, 15.8:1 contrast) and `#cbd5e1` (Secondary, 9.2:1 contrast).
- Accent: `#ef4444` for enhanced optical visibility against deep surfaces.

## Typography

Typography is the cornerstone of the publication. The system pairs an authoritative, high-legibility serif for editorial storytelling (`Merriweather` / Devanagari / Gujarati system fallbacks) with a clean neutral grotesque sans (`Inter` / system-ui) for metadata, live tickers, navigation, and badges.

### Multilingual Script Harmony

The font stack prioritizes script balance across English, Hindi, and Gujarati:
- English: `Merriweather`, Georgia, serif
- Hindi (Devanagari): `'Noto Sans Devanagari'`, system-ui
- Gujarati: `'Noto Sans Gujarati'`, system-ui

Line heights are deliberately expanded (`line-height: 1.75` for body, `1.25` for headlines) to prevent ascender/descender collisions in complex conjunct characters common in Devanagari and Gujarati.

### Typographic Hierarchy

- **Editorial Lead Display (H1)**: `clamp(2rem, 4vw, 2.75rem)` / line-height 1.18 / letter-spacing -0.02em / bold.
- **Section & Rail Headlines (H2)**: `clamp(1.5rem, 2.5vw, 1.875rem)` / line-height 1.25 / letter-spacing -0.015em.
- **Article Card Titles (H3)**: `1.25rem` (20px) / line-height 1.35 / semibold.
- **Prose Body**: `1.125rem` (18px) / line-height 1.75 / max line measure capped at 68ch for optimal reader saccadic eye movement.
- **Editorial Byline & Dateline**: `0.875rem` (14px) / font-weight 500 / color `var(--color-text-muted)`.

## Elevation

The broadsheet system avoids artificial layered drop-shadows. Depth is established through **architectural hairline borders (1px solid var(--color-border))** and subtle tonal background shifts.

- **Hairline Rule**: `1px solid var(--color-border)` separating editorial columns, ticker ribbons, and header boundaries.
- **Interactive Hover Lift**: `0 4px 12px rgba(0, 0, 0, 0.05)` (light) / `0 4px 16px rgba(0, 0, 0, 0.35)` (dark).
- **Modal Scrim**: `rgba(0, 0, 0, 0.6)` with backdrop blur `4px` to focus user attention during authentication or dialogs.

## Components

### 1. Article Card

- **Structure**: Aspect-ratio constrained 16:9 editorial imagery, category pill, unclipped headline, two-line excerpt preview, and discrete author/reading time metadata.
- **Interaction**: Card container hover triggers subtle border tint and title color shift. Never animate image scale on hover (`group-hover:scale` ban).
- **Bookmark Touch Target**: Minimum 44×44px hit-box pinned neatly in the card header.

### 2. Reading Progress Bar

- **Implementation**: Fixed top 3px bar using GPU-accelerated `transform: scaleX(progress)` with `transform-origin: left`.
- **Zero Relayout**: Eliminates layout-thrashing `transition: width`.

### 3. Editorial Blockquote & Pull Quote

- **Styling**: Distinctive typographic treatment: enlarged serif type (1.25rem), italicized, centered or subtly indented with an elegant hairline separator or background tint.
- **Anti-Pattern Ban**: Strictly avoids thick 4px side-tab accent borders.

### 4. Audio Story Player

- **Controls**: Clean play/pause/scrubber controls, 60fps wave visualization animated strictly via CSS transforms (`transform: scaleY(...)`), and exponential easing.

### 5. Interactive Opinion Poll

- **Visualization**: Background vote tally fills using `transform: scaleX(percentage)` with `transform-origin: left` on GPU compositor layers.

## Do's and Don'ts

### Do's
- **DO** cap article body prose width at 65–70ch (`max-width: 48rem`) to preserve comfortable eye travel across paragraphs.
- **DO** use `transform: scaleX()` with `transform-origin: left` for all progress bars, poll results, and audio scrubbers.
- **DO** maintain strict WCAG AAA contrast for all body prose and WCAG AA for UI controls across light and dark modes.
- **DO** ensure touch targets meet or exceed 44×44px on mobile viewports.
- **DO** preserve script harmony for Hindi and Gujarati with adjusted line-heights and fallback font stacks.

### Don'ts
- **DON'T** use 4px colored side-tab borders on quotes, callouts, or article cards.
- **DON'T** animate `width`, `height`, `padding`, or `margin` in CSS transitions.
- **DON'T** animate `<img>` scale or zoom on card hover.
- **DON'T** use bouncy or elastic easing curves; use smooth exponential deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **DON'T** use washed-out light gray body text or hardcoded hex gradients that clash in dark mode.
- **DON'T** repeat uppercase tracked eyebrow labels ("BREAKING", "TOP STORIES", "POLITICS") above every single heading.
