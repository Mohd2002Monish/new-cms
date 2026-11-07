# Product

## Register

brand

## Users

Curious, news-attentive readers seeking timely, authoritative journalism across local, national, and international stories in English, Hindi, and Gujarati. Readers consume content across diverse contexts: quick morning commutes on mobile, midday breaking updates, and sustained deep-dive evening reading on desktop and tablets.

## Product Purpose

A digital-first, high-performance news publication portal and CMS that delivers authoritative journalism, real-time breaking news updates, interactive polls, live coverage timelines, and audio narrations. Success is measured by immediate readability, zero cognitive friction, rapid Core Web Vitals performance, and reader trust.

## Brand Personality

- **3-Word Persona**: Authoritative, Disciplined, Contemporary.
- **Voice & Tone**: High-integrity broadsheet journalism with modern digital poise. Confident without shouting, crisp without dryness, deep without visual clutter.
- **Benchmarks**: The Atlantic, Financial Times, The New York Times, Reuters.

## Anti-references

- **AI Slop & Scaffolding**: 4px side-tab border callouts on cards/quotes, gratuitous uppercase tracked eyebrows on every section, and bouncy entrance animations.
- **Tabloid Gimmicks**: Sensory-overload flashing banners, spammy clickbait popups, and aggressive layout-shifting widgets.
- **Low-Contrast Washed Gray Type**: Low-contrast gray body text on tinted surfaces; hard-to-read muted text.
- **Layout Thrash**: Animating `width` or `height` on progress bars or live elements instead of GPU compositor properties (`transform: scaleX`).

## Design Principles

1. **Content is Sovereign**: The article body and editorial headline hold utmost visual priority. Chrome, navigation, and widgets support the story rather than compete with it.
2. **Swiss Typographic Rigor**: Rational grid alignment, disciplined typographic hierarchy (sharp display serif headings paired with clean, highly-legible grotesque sans and multilingual Devanagari/Gujarati script parity).
3. **Compositor-First Fluid Motion**: Every micro-interaction is 60fps hardware-accelerated (`transform`, `opacity`) with exponential easing (`cubic-bezier(0.16, 1, 0.3, 1)`) and zero layout thrash.
4. **Resilient Contrast in Both Modes**: Strict WCAG AAA compliance (≥7:1 for body copy, ≥4.5:1 for UI elements) in light and dark modes with calibrated surface tokens rather than inverted grays.
5. **Harmonious Multilingual Balance**: Type measure, leading, and baseline rhythm calibrate equally across English, Hindi (Devanagari), and Gujarati scripts without clipping or uneven line spacing.

## Accessibility & Inclusion

- Target standard: WCAG 2.2 Level AA / AAA contrast standards.
- Reduced-motion support (`@media (prefers-reduced-motion: reduce)`) across all live bars, tickers, and audio visualizers.
- Minimum interactive touch target size: 44×44px for all mobile controls and bookmark actions.
- Full keyboard navigation focus rings with high-visibility contrast.
- Fluid font scaler (sm/md/lg) preserving line measure ≤75ch.

