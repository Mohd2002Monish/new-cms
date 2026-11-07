# Agent Instructions & Repository Guide

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & CODING MODELS:**
> **READ THIS FILE FIRST** before inspecting, modifying, or creating any code in this repository.
> Every task must follow the protocol documented below.

---

## 1. The Cardinal Rule: Check `COMPONENT_INDEX.md` First

Whenever you are assigned any task—whether it is fixing a bug, adding a feature, refactoring, styling, or answering a question about how something works—**DO NOT** run blind global searches across the codebase.

**IMMEDIATELY OPEN AND READ:**
📁 **[`COMPONENT_INDEX.md`](./COMPONENT_INDEX.md)**

`COMPONENT_INDEX.md` is the centralized, authoritative index that documents:
- Every component in the application and its exact file path.
- Its single responsibility and functionalities.
- All extracted subcomponents (in `components/article/`, `components/audio/`, `components/auth/`, `components/comments/`, `components/feed/`, `components/poll/`, `components/sidebar/`).
- Accepted props, internal state, and external dependencies.
- A **Troubleshooting & Bug Triaging Guide** linking common symptoms directly to the exact file you must inspect.

---

## 2. Repository Architecture

This repository is a digital journalism platform organized into three distinct packages:

```
news-cms/
├── public-frontend/     # Next.js (App Router) — Public Reader-Facing Web Portal
├── mobile/              # React Native + Expo — Reader-Facing Mobile App (iOS/Android/Web)
├── frontend/            # React + Vite — Newsroom CMS Admin Dashboard
├── backend/             # Node.js + Express + MongoDB — REST & Real-time API
├── COMPONENT_INDEX.md   # Single Source of Truth for all Component Functionality
├── PRODUCT.md           # Strategic Product Voice, Register, and Persona
├── DESIGN.md            # Normative Design Tokens, Typography, and Rules
└── AGENT.md             # This mandatory AI Agent Operating Directive
```

### The Surfaces
1. **Public News Website (`public-frontend`)**:
   - **Stack**: Next.js 16 (App Router), React 19, Tailwind CSS 4, next-themes, Lucide icons, `@tanstack/react-query`.
   - **Purpose**: High-speed, reader-facing digital broadsheet with multilingual support (`en`, `hi`, `gu`), audio narrations, real-time live blogging, paywalls, and interactive polls.
2. **Reader Mobile App (`mobile`)**:
   - **Stack**: React Native (0.74+), Expo 51, React Navigation, Expo-AV, AsyncStorage, Lucide icons.
   - **Purpose**: Reader mobile application featuring seamless reader auth (Password & OTP), newsfeed browsing, offline saved library, and a continuous **Daily Audio Briefing Playlist (Top 20–30 daily news stories)** with auto-advance, scrubber, waveform visualizer, and mini-player.
3. **Admin CMS (`frontend`)**:
   - **Stack**: React (Vite), Redux Toolkit, Tailwind CSS, Tiptap collaborative editor, Recharts.
   - **Purpose**: Newsroom operations—article drafting, revision tracking, editorial approval queues, user permission overrides, and analytics.
4. **Backend API (`backend`)**:
   - **Stack**: Express.js, MongoDB (Mongoose), JWT with HTTP-only refresh cookies, OTP 2FA, Socket.io, Cloudinary.

---

## 3. Component Architecture & Sizing Rules

To ensure any developer or future coding agent can isolate and fix issues instantly, this repository enforces strict component modularity:

1. **Strict Line Limit**: No component should exceed **200–250 lines of code**.
2. **Single Responsibility**: An orchestrator component coordinates state and data fetching, while presentation and specialized logic are delegated to child subcomponents:
   - Auth forms live in `components/auth/`
   - Audio controls live in `components/audio/`
   - Article reading widgets live in `components/article/`
   - Discussion widgets live in `components/comments/`
   - Feed utilities live in `components/feed/`
   - Poll widgets live in `components/poll/`
   - Drawer sections live in `components/sidebar/`
3. **When Adding New Features**: **DO NOT** append dozens of lines to parent components. Create a new focused subcomponent in the appropriate domain folder and import it into the parent coordinator.
4. **Mandatory Index Updates**: Whenever you create, rename, or split a component, **you MUST update [`COMPONENT_INDEX.md`](./COMPONENT_INDEX.md)** to reflect the changes.

---

## 4. Design & Performance Standards (Strictly Enforced)

Refer to **[`PRODUCT.md`](./PRODUCT.md)** and **[`DESIGN.md`](./DESIGN.md)** for design system rules:

- **Zero Layout Thrash**: Never animate `width`, `height`, `padding`, or `margin` in CSS transitions or scroll handlers. Use hardware-accelerated compositor properties: `transform: scaleX(...)`, `transform: scaleY(...)`, or `opacity`.
- **No Image Hover Zooms**: Do not apply `transform: scale(...)` or `group-hover:scale` to images on hover. Provide interactive feedback through card borders, shadows, or headline color shifts.
- **No 4px Side-Tab Borders**: Never use thick colored accent stripes (`border-left: 4px solid ...`) on cards, callouts, or quotes. Use architectural 1px borders with background tints.
- **Strict WCAG AAA Contrast**: Ensure body text achieves ≥7:1 contrast and secondary text achieves ≥4.5:1 contrast against backgrounds in both light and dark modes.
- **Multilingual Script Harmony**: Maintain comfortable line heights (`line-height: 1.75` for body, `1.25` for headings) to accommodate conjuncts in Hindi (Devanagari) and Gujarati without clipping.

---

## 5. Agent Workflow Checklist

When executing any task on this codebase:
- [ ] **Step 1**: Read `AGENT.md` (this file).
- [ ] **Step 2**: Open `COMPONENT_INDEX.md` and identify the exact component file responsible for the feature/bug.
- [ ] **Step 3**: Review `PRODUCT.md` and `DESIGN.md` if changing styles or UI elements.
- [ ] **Step 4**: Perform minimal, clean edits. Keep components small. Extract subcomponents if file length approaches 200 lines.
- [ ] **Step 5**: If components were added or modified, update `COMPONENT_INDEX.md`.

