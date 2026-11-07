# Component Functionality Index

> **Notice for Coding Agents**: Use this file as your single source of truth to locate which component implements which feature. Do not guess or perform exhaustive searches across the repository when this index specifies the exact path, responsibilities, props, and dependencies.

---

## Table of Contents

1. [Architectural Overview & Folder Map](#1-architectural-overview--folder-map)
2. [Article & Long-form Reading Components](#2-article--long-form-reading-components)
3. [Audio & Text-to-Speech Components](#3-audio--text-to-speech-components)
4. [Authentication & User Account Components](#4-authentication--user-account-components)
5. [Feed, Discovery & Infinite Scroll Components](#5-feed-discovery--infinite-scroll-components)
6. [Navigation, Layout & Chrome Components](#6-navigation-layout--chrome-components)
7. [Reader Engagement & Community Components](#7-reader-engagement--community-components)
8. [Search, Filtering & Categorization Components](#8-search-filtering--categorization-components)
9. [Public Reader App Pages (`app/[lang]/...`)](#9-public-reader-app-pages)
10. [Admin CMS Dashboard Components (`frontend/src/...`)](#10-admin-cms-dashboard-components)
11. [Troubleshooting & Bug Triaging Guide](#11-troubleshooting--bug-triaging-guide)

---

## 1. Architectural Overview & Folder Map

```
public-frontend/src/
├── app/                      # Next.js App Router pages (SSR, ISR, metadata, JSON-LD)
│   ├── [lang]/               # Multilingual localized routes ('en', 'hi', 'gu')
│   │   ├── articles/[slug]/  # Single article reading page
│   │   ├── category/[slug]/  # Category feed view
│   │   ├── history/          # User reading history & streak view
│   │   ├── saved/            # Bookmarked articles view
│   │   ├── search/           # Search results view
│   │   ├── layout.js         # Root locale layout with Theme & Client providers
│   │   └── page.js           # Public homepage (Hero, Rails, Infinite Feed)
│   └── globals.css           # Global design tokens, Swiss editorial styles, dark mode
├── components/               # UI components
│   ├── article/              # Subcomponents for article reading & paywalling
│   ├── audio/                # Subcomponents for audio narration & scrubber
│   ├── auth/                 # Subcomponents for login, register, OTP & dev tools
│   ├── comments/             # Subcomponents for comments & discussion
│   ├── feed/                 # Subcomponents for infinite scrolling & skeletons
│   ├── poll/                 # Subcomponents for reader opinion polls
│   ├── sidebar/              # Subcomponents for mobile navigation drawer
│   └── [Standalone].jsx      # Core UI widgets (Header, Footer, Cards, etc.)
├── context/                  # React Contexts (AuthContext)
├── hooks/                    # Custom React hooks (useBookmarks)
├── i18n/                     # Language dictionaries ('en', 'hi', 'gu')
└── lib/                      # Utilities & Axios API clients
```

---

## 2. Article & Long-form Reading Components

### `ArticleContentWrapper`
- **File**: `public-frontend/src/components/ArticleContentWrapper.jsx`
- **Role**: Master orchestrator for the article reading experience.
- **Responsibilities**:
  - Connects to Socket.io for real-time live blog rolling updates.
  - Verifies paywall status and monthly read limits (5 free articles for guests).
  - Coordinates child modules: audio player, rich text body, live updates, social sharing, tags, related stories, reactions, and comments.
- **Subcomponents**:
  - `components/article/PaywallBanner.jsx`
  - `components/article/LiveBlogTimeline.jsx`
  - `components/article/ArticleTags.jsx`
  - `components/AudioPlayer.jsx`
  - `components/TiptapRenderer.jsx`
  - `components/ShareButtons.jsx`
  - `components/RelatedArticles.jsx`
  - `components/ReactionsBar.jsx`
  - `components/CommentsSection.jsx`
- **Key Props**: `{ initialArticle: object }`
- **Used In**: `public-frontend/src/app/[lang]/articles/[slug]/page.js`

### `PaywallBanner`
- **File**: `public-frontend/src/components/article/PaywallBanner.jsx`
- **Role**: Paywall lockout screen.
- **Responsibilities**:
  - Displays article excerpt blockquote.
  - Shows locked reason banner (`limit_exceeded` or `premium_login_required`).
  - Provides Sign In / Sign Up CTA and mock upgrade to Premium CTA.
- **Key Props**: `{ excerpt, lockReason, user, onOpenAuth, onSubscribe }`

### `LiveBlogTimeline`
- **File**: `public-frontend/src/components/article/LiveBlogTimeline.jsx`
- **Role**: Rolling updates timeline for breaking and live blog stories.
- **Responsibilities**:
  - Renders pulsing live coverage badge.
  - Renders vertical timeline track with timestamped live update cards.
- **Key Props**: `{ liveUpdates: Array }`

### `ArticleTags`
- **File**: `public-frontend/src/components/article/ArticleTags.jsx`
- **Role**: Taxonomy tag list.
- **Responsibilities**:
  - Renders list of clickable `#tag` chips linking to search page.
- **Key Props**: `{ tags: Array<string> }`

### `ReadingProgressBar`
- **File**: `public-frontend/src/components/ReadingProgressBar.jsx`
- **Role**: Top viewport reading progression indicator.
- **Responsibilities**:
  - Tracks scroll position passively via `window.addEventListener('scroll')`.
  - Animates `transform: scaleX(...)` on GPU compositor layer with zero layout thrash.
- **Key Props**: None (self-contained client component).
- **Used In**: `public-frontend/src/app/[lang]/articles/[slug]/page.js`

### `FontSizeAdjuster`
- **File**: `public-frontend/src/components/FontSizeAdjuster.jsx`
- **Role**: Reader accessibility control.
- **Responsibilities**:
  - Toggles font size scale across `.article-body--sm`, `.article-body--md`, `.article-body--lg`.
  - Persists preference in `localStorage`.
- **Used In**: `public-frontend/src/app/[lang]/articles/[slug]/page.js`

### `TiptapRenderer`
- **File**: `public-frontend/src/components/TiptapRenderer.jsx`
- **Role**: Rich-text HTML renderer for Tiptap JSON document trees.
- **Responsibilities**:
  - Parses JSON AST node tree into semantic HTML (headings, paragraphs, blockquotes, codeblocks, images, embedded opinion polls).
- **Key Props**: `{ content: object }`

---

## 3. Audio & Text-to-Speech Components

### `AudioPlayer`
- **File**: `public-frontend/src/components/AudioPlayer.jsx`
- **Role**: Text-to-speech article narrator coordinator.
- **Responsibilities**:
  - Coordinates HTML5 `<audio>` playback, API speech fetching, and Web Speech API fallback.
  - Manages playback rates (1x, 1.25x, 1.5x, 2x) and voice language selection.
- **Subcomponents**:
  - `components/audio/AudioPlayButton.jsx`: Play / Pause / Loading spinner button.
  - `components/audio/AudioScrubber.jsx`: Time counter, seekable progress track.
  - `components/audio/AudioWaveVisualizer.jsx`: GPU-accelerated 5-bar soundwave visualizer (`scaleY`).
  - `components/audio/AudioSpeedSelector.jsx`: Speed toggle pills.
  - `components/audio/AudioLanguageSelector.jsx`: Language select dropdown (EN, HI, GU).
  - `components/audio/AudioPlayerStyles.jsx`: Scoped CSS styles.
- **Key Props**: `{ text: string, language: string, articleId: string, title: string }`
- **Used In**: `ArticleContentWrapper.jsx`

---

## 4. Authentication & User Account Components

### `AuthModal`
- **File**: `public-frontend/src/components/AuthModal.jsx`
- **Role**: Central authentication dialog coordinator.
- **Responsibilities**:
  - Controls modal open/close transitions.
  - Manages authentication state machine: `login-password`, `login-otp`, `register`, `forgot`, `reset`.
  - Coordinates API calls via `AuthContext`.
- **Subcomponents**:
  - `components/auth/AuthGoogleButton.jsx`: Google OAuth button and SVG icon.
  - `components/auth/AuthTabs.jsx`: Tab switcher between Password and Verification OTP.
  - `components/auth/AuthLoginForm.jsx`: Email + Password sign-in form.
  - `components/auth/AuthOtpForm.jsx`: Passwordless OTP form with 60s resend timer.
  - `components/auth/AuthRegisterForm.jsx`: Account creation form.
  - `components/auth/AuthForgotPasswordForm.jsx`: OTP request for forgotten passwords.
  - `components/auth/AuthResetPasswordForm.jsx`: Password reset submission form.
  - `components/auth/AuthDevQuickLogin.jsx`: One-click local testing sessions (Reader, Editor, Admin).
- **Used In**: `ClientLayout.jsx` (globally accessible across all routes).

### `AuthContext`
- **File**: `public-frontend/src/context/AuthContext.js`
- **Role**: Global reader authentication context provider.
- **Responsibilities**:
  - Persists JWT tokens and refresh cookies.
  - Exposes `user`, `loginWithPassword`, `loginWithOtp`, `register`, `logout`, `subscribe`, `openAuthModal`, `closeAuthModal`.

---

## 5. Feed, Discovery & Infinite Scroll Components

### `HeroSlider`
- **File**: `public-frontend/src/components/HeroSlider.jsx`
- **Role**: Top-of-page interactive featured stories carousel.
- **Responsibilities**:
  - Powered by `embla-carousel-react` with autoplay.
  - Fetches featured articles (`isSlider=true`).
  - Displays slide image, category badge, headline, and time-ago metadata.
- **Used In**: `public-frontend/src/app/[lang]/page.js`

### `CategoryRail`
- **File**: `public-frontend/src/components/CategoryRail.jsx`
- **Role**: Horizontal card rail for a single news section (e.g., Politics, Tech).
- **Responsibilities**:
  - Displays category header with accent bar, category icon, and subcategory pill links.
  - Renders 3-column `DashboardCard` grid.
- **Key Props**: `{ category: object, articles: Array }`
- **Used In**: `public-frontend/src/app/[lang]/page.js`

### `ForYouRail`
- **File**: `public-frontend/src/components/ForYouRail.jsx`
- **Role**: Personalized recommendation rail based on reader habits.
- **Responsibilities**:
  - Reads stored user interest vectors or guest scores from `localStorage`.
  - Queries `/api/public/recommendations` and renders curated story cards.
- **Used In**: `public-frontend/src/app/[lang]/page.js`

### `InfiniteNewsFeed`
- **File**: `public-frontend/src/components/InfiniteNewsFeed.jsx`
- **Role**: Continuous scrolling news feed at the bottom of the homepage.
- **Responsibilities**:
  - Uses `IntersectionObserver` to trigger paginated fetches on scroll.
  - Excludes articles already rendered in above-the-fold category rails.
- **Subcomponents**:
  - `components/feed/FeedSkeletons.jsx`: Pulsing skeleton cards.
  - `components/feed/FeedStatusIndicator.jsx`: All caught up checkmark or loading spinner.
- **Key Props**: `{ initialExcludedSlugs: Array, lang: string }`
- **Used In**: `public-frontend/src/app/[lang]/page.js`

### `TrendingSidebar`
- **File**: `public-frontend/src/components/TrendingSidebar.jsx`
- **Role**: Right-column widget showing top trending stories.
- **Responsibilities**:
  - Displays numbered ranking list (1–5) with 52×52px thumbnail and title.
- **Key Props**: `{ articles: Array }`
- **Used In**: `public-frontend/src/app/[lang]/page.js`

---

## 6. Navigation, Layout & Chrome Components

### `Header`
- **File**: `public-frontend/src/components/Header.jsx`
- **Role**: Sticky top navigation bar.
- **Responsibilities**:
  - Brand identity logo.
  - Desktop category links.
  - Search icon, Theme toggle, Language switcher, and mobile hamburger drawer toggle.
- **Used In**: `ClientLayout.jsx`

### `Sidebar`
- **File**: `public-frontend/src/components/Sidebar.jsx`
- **Role**: Off-canvas mobile navigation drawer.
- **Responsibilities**:
  - Mobile slide-in panel with backdrop.
  - Theme toggle pill and language switcher.
- **Subcomponents**:
  - `components/sidebar/SidebarUserProfile.jsx`: User avatar, reading streak flame badge, sign in/sign out button.
  - `components/sidebar/SidebarNavLinks.jsx`: Home, Saved Articles, Reading History, and Category links.
- **Key Props**: `{ isOpen: boolean, setIsOpen: function }`
- **Used In**: `ClientLayout.jsx`

### `Footer`
- **File**: `public-frontend/src/components/Footer.jsx`
- **Role**: Site-wide footer with branding, category sitemap, legal links, and copyright.
- **Used In**: `ClientLayout.jsx`

### `Breadcrumb`
- **File**: `public-frontend/src/components/Breadcrumb.jsx`
- **Role**: Navigation breadcrumb trail (e.g. `Home > Technology > Story Title`).
- **Key Props**: `{ items: Array<{ label, href }> }`

### `Ticker`
- **File**: `public-frontend/src/components/Ticker.jsx`
- **Role**: Breaking news ticker ribbon.
- **Responsibilities**:
  - Scrolling marquee displaying real-time breaking news headlines with live dot indicator.
- **Used In**: `Header.jsx`

---

## 7. Reader Engagement & Community Components

### `CommentsSection`
- **File**: `public-frontend/src/components/CommentsSection.jsx`
- **Role**: Reader discussion and threaded comments coordinator.
- **Responsibilities**:
  - Fetches existing comments for the article slug.
  - Handles comment submission and error states.
- **Subcomponents**:
  - `components/comments/CommentForm.jsx`: Input textarea, user status, sign-in prompt.
  - `components/comments/CommentItem.jsx`: Comment card with author avatar and relative time.
- **Key Props**: `{ articleSlug: string }`
- **Used In**: `ArticleContentWrapper.jsx`

### `ReactionsBar`
- **File**: `public-frontend/src/components/ReactionsBar.jsx`
- **Role**: Emoji article reaction widget (👍 Like, ❤️ Love, 😮 Surprised, 😢 Sad, 😡 Angry).
- **Responsibilities**:
  - Tracks user vote in `localStorage` or DB.
  - Displays dynamic reaction counts with active state styling.
- **Key Props**: `{ articleSlug: string }`
- **Used In**: `ArticleContentWrapper.jsx`

### `BookmarkButton`
- **File**: `public-frontend/src/components/BookmarkButton.jsx`
- **Role**: Saves or unsaves an article for later reading.
- **Responsibilities**:
  - Syncs with `useBookmarks` hook.
  - Prompts `AuthModal` if reader is unauthenticated.
  - 44×44px accessible touch target.
- **Key Props**: `{ slug: string, showLabel?: boolean, className?: string }`
- **Used In**: `ArticleCard.jsx`, `DashboardCard.jsx`, `[slug]/page.js`

### `ShareButtons`
- **File**: `public-frontend/src/components/ShareButtons.jsx`
- **Role**: Social sharing strip.
- **Responsibilities**:
  - Native Web Share API (`navigator.share`) on mobile.
  - One-click share buttons for Twitter/X, Facebook, WhatsApp, LinkedIn, Telegram, and Copy Link with toast.
- **Key Props**: `{ title: string, text: string, className?: string }`

### `OpinionPoll`
- **File**: `public-frontend/src/components/OpinionPoll.jsx`
- **Role**: Embedded editorial opinion poll.
- **Responsibilities**:
  - Fetches poll data by `pollId`.
  - Submits votes and renders real-time results.
- **Subcomponents**:
  - `components/poll/PollOptionButton.jsx`: Interactive vote choice button.
  - `components/poll/PollResultBar.jsx`: Composited GPU-accelerated percentage fill bar (`scaleX`).
- **Key Props**: `{ pollId: string }`
- **Used In**: Embedded inside article content via `TiptapRenderer.jsx`

---

## 8. Search, Filtering & Categorization Components

### `SearchBar`
- **File**: `public-frontend/src/components/SearchBar.jsx`
- **Role**: Search input field with debounce and submission navigation to `/[lang]/search?q=...`.

### `SearchResults`
- **File**: `public-frontend/src/components/SearchResults.jsx`
- **Role**: Renders paginated search result articles matching query `q`.

### `FilterBar` & `CategoryTabStrip`
- **Files**: `public-frontend/src/components/FilterBar.jsx` & `CategoryTabStrip.jsx`
- **Role**: Filter bar for homepage and category views to toggle subcategories and sort orders.

### `ViewTracker`
- **File**: `public-frontend/src/components/ViewTracker.jsx`
- **Role**: Invisible client component that fires a view-count beacon to `/api/public/posts/:slug/view` on mount.

---

## 9. Public Reader App Pages

| Route | File Path | Description |
| :--- | :--- | :--- |
| `/[lang]` | `public-frontend/src/app/[lang]/page.js` | Public homepage (Hero Slider, Filter Bar, Rails, Infinite Feed, Trending) |
| `/[lang]/articles/[slug]` | `public-frontend/src/app/[lang]/articles/[slug]/page.js` | Single article view with JSON-LD, breadcrumb, editorial header, and `ArticleContentWrapper` |
| `/[lang]/category/[slug]` | `public-frontend/src/app/[lang]/category/[slug]/page.js` | Category archive with subcategory chips and article grid |
| `/[lang]/saved` | `public-frontend/src/app/[lang]/saved/page.js` | Saved articles collection saved locally or to account |
| `/[lang]/history` | `public-frontend/src/app/[lang]/history/page.js` | User reading history, streak tracker, and tracking toggle |
| `/[lang]/search` | `public-frontend/src/app/[lang]/search/page.js` | Article search with keyword and category filtering |

---

## 10. Admin CMS Dashboard Components

| Feature / Page | File Path | Description |
| :--- | :--- | :--- |
| **Post Editor** | `frontend/src/pages/PostEditor.jsx` | Rich Tiptap article editor with collaborative comments, split preview, revision history |
| **Post List** | `frontend/src/pages/PostList.jsx` | Editorial workflow table with status transitions (Draft, In Review, Published, Scheduled) |
| **Media Library** | `frontend/src/pages/MediaLibraryPage.jsx` | Cloudinary asset browser, drag-and-drop uploader, image cropper modal |
| **User Management** | `frontend/src/pages/UserManagement.jsx` | Staff role assignment (Admin, Manager, Editor), suspensions, OTP resets |
| **Reports & Analytics** | `frontend/src/pages/Reports.jsx` | Editorial throughput charts, manager queues, rejection rate analytics |
| **Categories Manager** | `frontend/src/pages/Categories.jsx` | Create, reorder, and translate main and subcategories |
| **Slider Manager** | `frontend/src/pages/SliderManager.jsx` | Pin and order hero banner carousel articles |
| **Audit Logs** | `frontend/src/pages/AuditLogs.jsx` | Immutable system event ledger with state diffs |
| **Rate Limits** | `frontend/src/pages/RateLimits.jsx` | Monitored throttled IP addresses with manual unblock |

---

## 11. Reader Mobile Application (`mobile/`)

A dedicated React Native + Expo mobile application for readers to browse news, log in, and listen to a continuous audio digest of the day's top 20–30 stories.

### Core Screens (`mobile/src/screens/`)
| Screen | File Path | Responsibilities |
| :--- | :--- | :--- |
| **`HomeScreen`** | `mobile/src/screens/HomeScreen.js` | Top Daily Briefing audio CTA banner, breaking news ticker, category horizontal pills, hero card, and paginated feed. |
| **`ArticleDetailScreen`** | `mobile/src/screens/ArticleDetailScreen.js` | Reader view with hero image, single-story TTS narration button, font scaler (A-/A+), bookmark toggle, and related coverage. |
| **`AudioDigestModalScreen`** | `mobile/src/screens/AudioDigestModalScreen.js` | Dedicated Fullscreen Player for the **Top 20–30 Daily News Audio Briefing**. Features waveform visualizer, timeline scrubber, 10s seek, skip next/prev, speed selector (1x–2x), language switcher (EN/HI/GU), and scrollable 25-story queue list. |
| **`CategoryScreen`** | `mobile/src/screens/CategoryScreen.js` | Section archives with category chips and story feed. |
| **`SearchScreen`** | `mobile/src/screens/SearchScreen.js` | Real-time debounced article search. |
| **`BookmarksScreen`** | `mobile/src/screens/BookmarksScreen.js` | Offline saved stories library with 1-tap reading. |
| **`ProfileScreen`** | `mobile/src/screens/ProfileScreen.js` | Reader profile, verified reader badge, saved counts, dark appearance switch, and logout. |
| **`LoginModalScreen`** | `mobile/src/screens/LoginModalScreen.js` | Reader authentication modal with Password, Instant OTP, and Registration tabs. |

### Audio Engine & Contexts (`mobile/src/context/`)
| Context | File Path | Responsibilities |
| :--- | :--- | :--- |
| **`AudioPlaylistContext`** | `mobile/src/context/AudioPlaylistContext.js` | Central audio state machine: queries top 20–30 articles, coordinates sequential playback, auto-advances to the next story upon completion (`didJustFinish`), provides play/pause, seeking, speed rate adjustment, and language narration switching. Supports both Expo-AV (native iOS/Android) and Web Audio (browser). |
| **`AuthContext`** | `mobile/src/context/AuthContext.js` | Reader auth state, JWT token management, persistent AsyncStorage storage, and cloud bookmark sync. |
| **`ThemeContext`** | `mobile/src/context/ThemeContext.js` | Swiss Modernism 2.0 digital broadsheet styling tokens (light/dark mode). |

### Mobile Components (`mobile/src/components/`)
| Component | File Path | Role |
| :--- | :--- | :--- |
| **`DailyBriefingBanner`** | `mobile/src/components/DailyBriefingBanner.js` | Prominent home hero card with 1-click **"Play Top 25 News (15m)"** button and live track indicator. |
| **`FloatingMiniPlayer`** | `mobile/src/components/FloatingMiniPlayer.js` | Persistent bottom audio player bar allowing readers to browse articles while listening. |
| **`ArticleCard`** | `mobile/src/components/ArticleCard.js` | Editorial news card with headline typography, reading time, category pill, and bookmark toggle. |
| **`CategoryPills`** | `mobile/src/components/CategoryPills.js` | Horizontal scrolling section chip selector. |
| **`AudioVisualizerBar`** | `mobile/src/components/AudioVisualizerBar.js` | 60fps compositor equalizer frequency bar animation. |
| **`HeaderBar`** | `mobile/src/components/HeaderBar.js` | Editorial broadsheet header with date, edition, theme toggle, and search trigger. |

---

## 12. Troubleshooting & Bug Triaging Guide

| Problem / Symptom | Primary File to Inspect | Secondary File |
| :--- | :--- | :--- |
| **Paywall not locking / unlocking properly** | `public-frontend/src/components/ArticleContentWrapper.jsx` | `public-frontend/src/components/article/PaywallBanner.jsx` |
| **Live blog updates not streaming** | `public-frontend/src/components/article/LiveBlogTimeline.jsx` | Socket.io backend route `backend/src/server.js` |
| **Audio narration not playing or soundwave broken** | `public-frontend/src/components/AudioPlayer.jsx` | `public-frontend/src/components/audio/AudioScrubber.jsx` |
| **Login / Register / OTP modal issues** | `public-frontend/src/components/AuthModal.jsx` | `public-frontend/src/components/auth/` subcomponents |
| **Comments not submitting or loading** | `public-frontend/src/components/comments/CommentForm.jsx` | `public-frontend/src/components/CommentsSection.jsx` |
| **Poll voting failure or visual bar glitch** | `public-frontend/src/components/poll/PollResultBar.jsx` | `public-frontend/src/components/OpinionPoll.jsx` |
| **Sidebar drawer not opening on mobile** | `public-frontend/src/components/Sidebar.jsx` | `public-frontend/src/components/ClientLayout.jsx` |
| **Infinite feed duplicating cards or not loading** | `public-frontend/src/components/InfiniteNewsFeed.jsx` | `public-frontend/src/components/feed/` subcomponents |
| **Reading progress bar jank or position error** | `public-frontend/src/components/ReadingProgressBar.jsx` | `public-frontend/src/app/globals.css` |

