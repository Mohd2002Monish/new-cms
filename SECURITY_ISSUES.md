# Security Review — News CMS

Scope: uncommitted multilingual-migration changes plus a manual pass over the
core backend (auth, OTP, authorization, public API, AI integration, media
upload) and both frontends. Reviewed 2026-07-21.

Legend: **Status** — `Open` (not yet fixed) / `Fixed` (patched in this pass) /
`Accepted risk` (reviewed, not exploitable enough to act on).

---

## Issue 1: Public "reader" accounts can reach internal staff-only CMS endpoints

- **Severity:** High
- **Confidence:** 9/10
- **Status:** Fixed
- **Location:** `backend/src/routes/posts.js`, `backend/src/routes/comments.js`,
  `backend/src/routes/media.js`, `backend/src/routes/ai.js`

**Description**

Public readers self-register via `POST /api/public/auth/register` with zero
vetting and get a JWT from the exact same `generateAccessToken()` /
`JWT_SECRET` used for staff accounts (`backend/src/utils/otp.js`). The
`authenticate` middleware doesn't distinguish "staff" from "public reader" —
it just verifies the JWT and loads whatever `User` document matches. Several
internal routers relied on `authenticate` + `checkActive` alone, with no
`authorize()`/`hasPermission()`/role check at all:

- `backend/src/routes/posts.js` — `POST /api/posts` (create a draft),
  `PATCH /api/posts/:id/submit`, `POST /api/posts/polls`, and the nested
  comments sub-router all had no staff gate.
- `backend/src/routes/comments.js` — internal editorial review threads
  (`GET`/`POST` comments, replies, resolve) had no role check whatsoever.
- `backend/src/routes/media.js` — full CRUD on the media library, **plus**
  `POST /api/media/sign`, which mints a real signed Cloudinary upload
  credential.
- `backend/src/routes/ai.js` — Gemini-backed AI suggestion/generation/edit
  endpoints, billed against the org's API key.

**Exploit scenario**

Anyone visits the public site, registers a free reader account (no approval
step), and uses the resulting access token against the admin API origin.
Without touching a single staff credential they can: create draft CMS posts
and submit them for review; read and post internal editorial comments on any
article in the system, including ones under active review by other editors;
obtain a signed Cloudinary upload credential and push arbitrary files into the
CMS's media library; and invoke the paid Gemini AI endpoints on the org's
dime.

**Fix applied**

Added a `requireStaff` middleware (`backend/src/middleware/authorize.js`)
that rejects any role other than `admin`/`manager`/`editor`, and applied it
at the router level for `posts.js` (which also covers the nested
`comments.js` and `polls` mount), `comments.js` itself (defense in depth, in
case it's ever mounted elsewhere), `media.js`, and each route in `ai.js`.

This investigation surfaced two narrower, related sub-issues, tracked and
fixed separately below (1a, 1b) since they're independent bugs in their own
right, not just consequences of the reader/staff confusion.

---

### Issue 1a (sub-issue of 1): staff comments endpoints had no per-post visibility check

- **Severity:** Medium
- **Confidence:** 8/10
- **Status:** Fixed
- **Location:** `backend/src/controllers/comments.controller.js`
  (`getComments`, `createComment`, `addReply`, `resolveComment`)

**Description**

Even restricted to staff, `comments.controller.js` never checked that the
requester actually has access to the *post* a comment thread belongs to —
unlike every other post-scoped controller (`getPostById`, `updatePost`,
`getRevisions`), which all enforce owner/co-author/assignedManager
visibility. Any editor could read and post internal editorial review notes
on any post in the system, including ones they have no authoring or
assignment relationship to and have never been granted view access to via
`getPostById`.

**Fix applied**

Added an `assertPostAccess(user, post)` helper mirroring `getPostById`'s
rule (admin: unrestricted; manager: must match `assignedManager`; editor:
must be author or co-author), called from `getComments`, `createComment`,
`addReply`, and `resolveComment` before any read or write.

---

### Issue 1b (sub-issue of 1): manager scoping missing on post revision history

- **Severity:** Low
- **Confidence:** 8/10
- **Status:** Fixed
- **Location:** `backend/src/controllers/postRevisions.controller.js`
  (`getRevisions`)

**Description**

`getRevisions` only restricted the `editor` role (owner/co-author check); it
had no equivalent restriction for `manager`, unlike `getPostById`, which
requires a manager's `assignedManager` to match the post. A manager could
read the full revision history of posts assigned to a different manager.

**Fix applied**

Added the same `assignedManager` check used in `getPostById`: a manager may
only view revisions for posts where `post.assignedManager` matches their own
`_id`.

---

## Issue 2: `translationGroup` has no ownership check — content spoofing

- **Severity:** Medium
- **Confidence:** 7/10
- **Status:** Fixed
- **Location:** `backend/src/controllers/posts.controller.js` (`createPost`,
  `updatePost`), surfaced publicly via `backend/src/controllers/public.controller.js`
  (`getPublicArticleBySlug`)

**Description**

The new `translationGroup` field is validated only as a syntactically-valid
Mongo ObjectId (`Joi.string().hex().length(24)`). Nothing checks that the
value actually belongs to a post the requesting user authored, co-authors, or
otherwise has access to. `getPublicArticleBySlug` then publicly renders every
live post sharing a `translationGroup` as an official "read this in
Hindi/Gujarati" sibling translation.

Both `getPublicArticles` and `getPublicArticleBySlug` return raw Mongo `_id`
values to anonymous callers, so any editor can trivially discover a target
article's real ObjectId, then submit their own draft with that
`translationGroup` via a direct API call (bypassing the admin UI, which only
ever sets this field to a post the user already has access to).

**Exploit scenario**

An editor account fetches a trusted, high-traffic article's `_id` from the
public articles API, creates their own draft with `translationGroup` set to
that ID, and gets it approved. The public article page for the trusted
article now advertises the editor's unrelated (or misleading) content as an
official translation, and vice versa — a real integrity/misinformation risk
for a news outlet, reachable by any account with post-creation rights.

**Fix applied**

`createPost` and `updatePost` now resolve the referenced `translationGroup` to
its anchor post and enforce the same visibility rules used everywhere else in
this controller (admin: unrestricted; manager: must be the anchor's
`assignedManager`; editor: must be the anchor's author or co-author). Linking
to a non-existent or inaccessible group is rejected with 400/403.

---

## Issue 3: `canActivateUser` editors can toggle status of any editor, not just their own team

- **Severity:** Low
- **Confidence:** 6/10 (pre-existing gap, not introduced by the current diff — the
  diff actually narrowed it by blocking these accounts from touching
  admins/managers)
- **Status:** Fixed
- **Location:** `backend/src/controllers/users.controller.js` (`toggleUserStatus`)

**Description**

`toggleUserStatus` correctly scopes **managers** to editors under their own
`assignedManager` (line ~292), and (as of this diff) blocks non-admin/manager
callers from touching admin/manager accounts. But an account with role
`editor` that has been granted the `canActivateUser` permission override (a
real, reachable permission — see `backend/src/middleware/authorize.js` and
`backend/src/routes/users.js:33`) can still activate/deactivate **any**
editor account system-wide, with no same-team scoping.

**Exploit scenario**

An org grants `canActivateUser` to a senior editor to manage their small
team. That editor calls `PATCH /api/users/:id/status` with the ID of an
editor from a completely different manager's team and deactivates that
unrelated colleague's account.

**Fix applied**

Added the same `assignedManager` team-scoping used for managers: an
editor-permission-holder may only toggle another editor's status when both
share the same `assignedManager`.

---

## Reviewed and not flagged (for context)

The following areas were checked closely and found to already follow secure
patterns — no action taken:

- **CORS / Helmet / mongo-sanitize** (`backend/app.js`) — origin allowlist,
  CSP intentionally disabled for a JSON-only API, `$`-key stripping in place.
- **OTP generation & verification** (`backend/src/utils/otp.js`,
  `auth.controller.js`) — `crypto.randomInt` (not `Math.random`), bcrypt-hashed
  OTP storage, per-IP rate limits on both request and verify endpoints,
  static dev-OTP hard-disabled in production.
- **JWT secrets** (`backend/src/config/env.js`) — placeholder/weak secrets are
  rejected outright in production; falls back to an ephemeral random secret
  (with a loud warning) only in dev.
- **Rich-text sanitization** — `contentHtml` is passed through
  `DOMPurify`-based `sanitizeHtml()` before every create/update and before
  Gemini-generated HTML is returned to the client.
- **`dangerouslySetInnerHTML` usages** — all four occurrences are either
  JSON-LD built through `jsonLdSafe()` (escapes `<` to prevent script
  breakout) or Tiptap HTML already run through `DOMPurify.sanitize()`.
  Article comments and live-blog updates are rendered as plain JSX text
  (`{comment.body}`), which React auto-escapes — not exploitable even though
  that content isn't HTML-sanitized server-side.
- **Cloudinary upload signing** (`media.controller.js`) — folder/public_id are
  regex-constrained before being signed; no arbitrary-path signing possible.
- **Mass assignment** — `updateUser` / `updateUserPermissions` both run
  through Joi `validate()` middleware before the controller ever sees
  `req.body`, so `Object.assign(doc, req.body)` only ever touches whitelisted
  fields.
- **NoSQL injection** — all user-supplied strings used inside `$regex` go
  through `escapeRegex()`; free-form search uses `$text` (tokenized), not raw
  regex, for the primary path.

## Not in scope / explicitly excluded per review policy

- Rate-limiting design (e.g., OTP-verify limiter keys per-IP, not per-account)
  — explicitly excluded as a rate-limiting concern, not reported.
- Access tokens stored in `localStorage` on both frontends — pre-existing,
  unrelated to this diff, and not currently exploitable (no XSS sink found).
  Worth a future hardening pass (httpOnly cookie for access token too) but not
  treated as an active vulnerability here.
