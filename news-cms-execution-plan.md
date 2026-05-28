# News CMS — Feature Execution Plan
### Scope: Admin Panel + Backend Only (User-facing panel excluded)

---

## Table of Contents
1. [Priority Matrix](#priority-matrix)
2. [Phase 1 — Audit Log](#phase-1--audit-log)
3. [Phase 2 — Soft Deletes](#phase-2--soft-deletes)
4. [Phase 3 — Rate Limiting](#phase-3--rate-limiting)
5. [Phase 4 — Notification System](#phase-4--notification-system)
6. [Phase 5 — Scheduled Publishing](#phase-5--scheduled-publishing)
7. [Phase 6 — Revision History & Versioning](#phase-6--revision-history--versioning)
8. [Phase 7 — SEO Fields](#phase-7--seo-fields)
9. [Phase 8 — Breaking News & Priority Flag](#phase-8--breaking-news--priority-flag)
10. [Phase 9 — Co-Authorship](#phase-9--co-authorship)
11. [Phase 10 — Inline Comment / Annotation Thread](#phase-10--inline-comment--annotation-thread)
12. [Phase 11 — Media Library](#phase-11--media-library)
13. [Phase 12 — Reports & Analytics Dashboard](#phase-12--reports--analytics-dashboard)
14. [Recommended Third-Party Libraries](#recommended-third-party-libraries)
15. [Database Migration Checklist](#database-migration-checklist)

---

## Priority Matrix

| Phase | Feature | Effort | Impact | Do First? |
|-------|---------|--------|--------|-----------|
| 1 | Audit Log | Medium | Critical | ✅ Yes |
| 2 | Soft Deletes | Low | High | ✅ Yes |
| 3 | Rate Limiting | Low | High | ✅ Yes |
| 4 | Notification System | Medium | High | ✅ Yes |
| 5 | Scheduled Publishing | Medium | High | ✅ Yes |
| 6 | Revision History | High | High | After Phase 5 |
| 7 | SEO Fields | Low | Medium | After Phase 6 |
| 8 | Breaking News Flag | Low | Medium | After Phase 7 |
| 9 | Co-Authorship | Medium | Medium | After Phase 8 |
| 10 | Inline Annotation Thread | High | High | After Phase 9 |
| 11 | Media Library | High | Medium | After Phase 10 |
| 12 | Reports Dashboard | High | High | Last |

> **Rule:** Complete each phase fully (schema + backend + admin UI) before moving to the next. Do not parallelize unless you have a separate frontend developer.

---

## Phase 1 — Audit Log

### Why first?
Audit logs must be present from the start. If you add them later, you lose all historical action data. They cannot be retrofitted meaningfully.

### What to track
Every destructive or state-changing action in the system:
- User created / updated / deleted / status toggled
- Post created / submitted / approved / rejected / deleted
- Category created / toggled active
- Permission override added / removed
- Login success / login failure / OTP sent / OTP failed
- Scheduled publish fired

### MongoDB Schema

```js
// Collection: audit_logs
{
  _id: ObjectId,
  actorId: ObjectId,          // Who did it (ref: users)
  actorEmail: String,         // Denormalized - keep even if user is deleted
  actorRole: String,          // 'admin' | 'manager' | 'editor'
  action: String,             // e.g. 'POST_APPROVED', 'USER_DELETED'
  targetType: String,         // 'Post' | 'User' | 'Category' | 'Permission'
  targetId: ObjectId,         // ID of the affected document
  targetLabel: String,        // Denormalized label e.g. post title, user email
  previousState: Mixed,       // Snapshot before the action (optional, for diff)
  newState: Mixed,            // Snapshot after the action (optional)
  ipAddress: String,
  userAgent: String,
  createdAt: Date             // TTL index: keep for 90 days or configure per policy
}
```

### Backend Implementation

**Step 1 — Create `auditLog.model.js`**
```
/backend/src/models/auditLog.model.js
```

**Step 2 — Create audit service**
```
/backend/src/services/audit.service.js
```
```js
// audit.service.js — core helper
const AuditLog = require('../models/auditLog.model');

async function log({ req, action, targetType, targetId, targetLabel, previousState, newState }) {
  return AuditLog.create({
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action,
    targetType,
    targetId,
    targetLabel,
    previousState,
    newState,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

module.exports = { log };
```

**Step 3 — Call `audit.log()` inside every controller after a state change**
```js
// Example: inside postsController.approvePost
await audit.log({
  req,
  action: 'POST_APPROVED',
  targetType: 'Post',
  targetId: post._id,
  targetLabel: post.title,
  previousState: { status: 'pending' },
  newState: { status: 'approved' },
});
```

**Step 4 — Create Admin API routes**
```
GET /api/admin/audit-logs
  Query params: actorId, action, targetType, targetId, dateFrom, dateTo, page, limit

GET /api/admin/audit-logs/:id
```

### Admin Panel UI (React)

**Page:** `Admin > Audit Log`

**Features to build:**
- Filterable table: filter by Action Type, Actor, Date Range, Target Type
- Each row expandable to show `previousState` / `newState` JSON diff
- Export to CSV button (client-side, use `papaparse`)
- No edit/delete controls — audit log is read-only

---

## Phase 2 — Soft Deletes

### Why
Hard deletes make audit trails, foreign key references, and recovery impossible. Soft deletes let you keep data integrity while hiding records from normal queries.

### Implementation

**Step 1 — Add `deletedAt` field to all major models**

Affected models: `User`, `Post`, `Category`

```js
// Add to schema
deletedAt: { type: Date, default: null },
deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
```

**Step 2 — Add Mongoose middleware to auto-exclude soft-deleted records**

```js
// In each schema definition:
schema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});
```

**Step 3 — Replace all `Model.deleteOne()` / `Model.findByIdAndDelete()` calls**

```js
// Before
await User.findByIdAndDelete(id);

// After
await User.findByIdAndUpdate(id, {
  deletedAt: new Date(),
  deletedBy: req.user._id
});
await audit.log({ action: 'USER_DELETED', ... });
```

**Step 4 — Admin "Trash" views**

Add a query param `?showDeleted=true` on admin routes (Admin only). Use `{ includeDeleted: true }` in the query options.

**Step 5 — Restore endpoint (Admin only)**

```
PATCH /api/admin/users/:id/restore
PATCH /api/admin/posts/:id/restore
PATCH /api/admin/categories/:id/restore
```

---

## Phase 3 — Rate Limiting

### Why now?
Your OTP endpoint is the most dangerous surface in your app. Without rate limiting, an attacker can brute-force 6-digit OTPs (1,000,000 combinations) in seconds.

### Implementation

**Library:** `express-rate-limit` + `rate-limit-mongo` (to persist limits across server restarts)

```
npm install express-rate-limit rate-limit-mongo
```

**Step 1 — Create `/backend/src/middleware/rateLimiter.js`**

```js
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

// Strict: OTP generation endpoint
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 OTP requests per IP per 15 min
  store: new MongoStore({ uri: process.env.MONGO_URI, collectionName: 'rate_limits' }),
  message: { error: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: OTP verification (prevent brute force of code)
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  store: new MongoStore({ uri: process.env.MONGO_URI, collectionName: 'rate_limits' }),
  message: { error: 'Too many failed attempts.' },
});

// General: All API routes
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  store: new MongoStore({ uri: process.env.MONGO_URI, collectionName: 'rate_limits' }),
});

module.exports = { otpRequestLimiter, otpVerifyLimiter, globalApiLimiter };
```

**Step 2 — Apply in `app.js` / `server.js`**

```js
const { globalApiLimiter, otpRequestLimiter, otpVerifyLimiter } = require('./middleware/rateLimiter');

app.use('/api', globalApiLimiter);
app.use('/api/auth/send-otp', otpRequestLimiter);
app.use('/api/auth/verify-otp', otpVerifyLimiter);
```

**Step 3 — Admin UI for Rate Limit Monitoring**

Add a `Rate Limits` panel in Admin showing the `rate_limits` collection: IP, hit count, last request. Useful for identifying abuse.

---

## Phase 4 — Notification System

### What notifications to support (Admin Panel scope)

| Event | Who Gets Notified |
|-------|------------------|
| Post submitted for review | Assigned Manager |
| Post approved | Author Editor |
| Post rejected (with reason) | Author Editor |
| New Editor assigned to Manager | Manager |
| User account deactivated | That User |
| Scheduled post published | Author Editor |

### MongoDB Schema

```js
// Collection: notifications
{
  _id: ObjectId,
  recipientId: ObjectId,        // ref: users
  type: String,                 // 'POST_APPROVED' | 'POST_REJECTED' | 'POST_SUBMITTED' etc.
  message: String,              // Human-readable message
  relatedModel: String,         // 'Post' | 'User'
  relatedId: ObjectId,          // ID of the related document
  isRead: { type: Boolean, default: false },
  createdAt: Date
}
```

### Backend Implementation

**Step 1 — Create `notification.model.js` and `notification.service.js`**

```js
// notification.service.js
async function create({ recipientId, type, message, relatedModel, relatedId }) {
  return Notification.create({ recipientId, type, message, relatedModel, relatedId });
  // Optionally: emit socket event here in future
}
```

**Step 2 — Call `notification.create()` alongside `audit.log()` in controllers**

```js
// Inside approvePost controller
await notification.create({
  recipientId: post.authorId,
  type: 'POST_APPROVED',
  message: `Your post "${post.title}" has been approved and is now live.`,
  relatedModel: 'Post',
  relatedId: post._id,
});
```

**Step 3 — API Routes**

```
GET    /api/notifications              — Get current user's notifications (paginated)
GET    /api/notifications/unread-count — Bell badge count
PATCH  /api/notifications/:id/read    — Mark single as read
PATCH  /api/notifications/read-all    — Mark all as read
DELETE /api/notifications/:id         — Dismiss
```

### Email Notification (Optional Layer)

- Use `Nodemailer` + `SendGrid` (already in your stack)
- Create email templates in `/backend/src/templates/emails/`
- Send email async (use a job queue in Phase 5 or fire-and-forget with try/catch for now)
- Make it togglable per user in their profile settings (`emailNotifications: Boolean`)

### Admin Panel UI

**Notification Bell** in admin navbar:
- Badge showing unread count (polling every 60s, or WebSocket later)
- Dropdown showing last 10 notifications
- "View All" page with filter by type and read status

---

## Phase 5 — Scheduled Publishing

### Concept

Editor (or Manager) sets a `publishAt` datetime when approving or creating a post. A background job checks every minute for posts whose `publishAt <= now` and whose `status === 'approved_scheduled'`.

### New Post Status

Extend the state machine:
```
Draft → Pending Approval → Approved (immediate) 
                         → Approved (Scheduled) → Published (auto)
                         → Rejected
```

### Schema Change (Posts model)

```js
// Add to Post schema
publishAt: { type: Date, default: null },       // Null = publish immediately on approval
status: {
  type: String,
  enum: ['draft', 'pending', 'approved', 'approved_scheduled', 'published', 'rejected'],
  default: 'draft'
}
```

### Background Job

**Library:** `node-cron`

```
npm install node-cron
```

**Create `/backend/src/jobs/scheduledPublisher.job.js`**

```js
const cron = require('node-cron');
const Post = require('../models/post.model');
const audit = require('../services/audit.service');
const notification = require('../services/notification.service');

// Runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const postsToPublish = await Post.find({
      status: 'approved_scheduled',
      publishAt: { $lte: now },
      deletedAt: null,
    });

    for (const post of postsToPublish) {
      post.status = 'published';
      await post.save();

      await audit.log({
        action: 'POST_SCHEDULED_PUBLISHED',
        targetType: 'Post',
        targetId: post._id,
        targetLabel: post.title,
      });

      await notification.create({
        recipientId: post.authorId,
        type: 'POST_PUBLISHED',
        message: `Your post "${post.title}" has been published automatically.`,
        relatedModel: 'Post',
        relatedId: post._id,
      });
    }
  } catch (err) {
    console.error('[ScheduledPublisher] Error:', err);
  }
});
```

**Register in `server.js`:**
```js
require('./jobs/scheduledPublisher.job');
```

### Admin Panel UI

- When approving a post, Manager sees two buttons: **Publish Now** and **Schedule**
- **Schedule** opens a datetime picker (`react-datepicker`)
- Admin dashboard shows a "Scheduled Posts" widget with upcoming publish queue
- Admin can cancel/reschedule from the queue

---

## Phase 6 — Revision History & Versioning

### Concept

Every time a Post is saved (not just submitted), snapshot the content into a separate `post_revisions` collection. On rejection, Editor can view history and restore any version.

### MongoDB Schema

```js
// Collection: post_revisions
{
  _id: ObjectId,
  postId: ObjectId,           // ref: posts
  version: Number,            // Auto-incremented integer per post
  content: Mixed,             // Full Tiptap JSON snapshot
  title: String,
  authorId: ObjectId,
  savedBy: ObjectId,          // Could be editor or manager (if manager edits)
  changeNote: String,         // Optional: "Fixed headline typo"
  createdAt: Date
}
```

### Backend Implementation

**Step 1 — Create `postRevision.model.js`**

**Step 2 — Create revision service**

```js
// postRevision.service.js
async function snapshot(post, savedBy) {
  const latest = await PostRevision.findOne({ postId: post._id }).sort({ version: -1 });
  const version = latest ? latest.version + 1 : 1;
  return PostRevision.create({
    postId: post._id,
    version,
    content: post.content,
    title: post.title,
    authorId: post.authorId,
    savedBy,
  });
}
```

**Step 3 — Call `snapshot()` on every post save**

```js
// In updatePost controller, after saving
await postRevision.snapshot(updatedPost, req.user._id);
```

### API Routes

```
GET  /api/posts/:id/revisions          — List all revisions (title, version, savedBy, date)
GET  /api/posts/:id/revisions/:version — Get a specific revision's full content
POST /api/posts/:id/revisions/:version/restore — Restore a version (creates new revision as well)
```

### Admin Panel UI

**Revision History Sidebar** (visible to Admin and Manager, and Editor on their own posts):
- Timeline list: version number, who saved it, when
- Click any version to preview the content in a read-only Tiptap instance
- "Restore this version" button — shows confirmation dialog

---

## Phase 7 — SEO Fields

### Schema Change (Posts model)

```js
// Add SEO object to Post schema
seo: {
  metaTitle:       { type: String, maxlength: 60 },
  metaDescription: { type: String, maxlength: 160 },
  ogTitle:         { type: String },
  ogDescription:   { type: String },
  ogImage:         { type: String },     // Cloudinary URL
  canonicalUrl:    { type: String },
  noIndex:         { type: Boolean, default: false },
  focusKeyword:    { type: String },
}
```

### Admin Panel UI

**SEO Panel** in Post edit page (collapsible section below editor):
- Character counters on `metaTitle` (60 max) and `metaDescription` (160 max) with color feedback (green/yellow/red)
- Live snippet preview showing how the post will appear in Google search results
- OG image uploader (direct to Cloudinary)
- `noIndex` checkbox
- `canonicalUrl` field (for syndicated content)

---

## Phase 8 — Breaking News & Priority Flag

### Schema Change (Posts model)

```js
// Add to Post schema
isBreaking: { type: Boolean, default: false },
priority:   { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
breakingExpiresAt: { type: Date, default: null }  // Auto-remove breaking badge after X hours
```

### Backend

- Add `isBreaking` and `priority` to the allowed fields in the Post update controller
- Only `manager` and `admin` roles can set `isBreaking: true` or `priority: 'urgent'`
- Add a cron job (extend Phase 5 job) to auto-clear expired breaking news flags

### Admin Panel UI

- Post list table shows color-coded `priority` badge and 🔴 BREAKING tag
- Manager's approval screen has a "Mark as Breaking" toggle with expiry time picker
- Admin dashboard has a "Currently Breaking" widget

---

## Phase 9 — Co-Authorship

### Schema Change (Posts model)

```js
// Replace single authorId with:
primaryAuthorId: { type: ObjectId, ref: 'User' },   // The original creator
coAuthors: [{ type: ObjectId, ref: 'User' }],        // Additional contributors
```

### Business Rules

- Only `admin` or the primary author's Manager can add co-authors
- Co-authors can edit the post while it is in `draft` status
- All authors (primary + co) are notified on approval/rejection
- Audit log records which author made each save (already handled by `savedBy` in revisions)

### Admin Panel UI

- Post edit page: "Co-Authors" field — searchable multi-select of Editors
- Post list shows up to 3 author avatars with a `+N` overflow indicator

---

## Phase 10 — Inline Comment / Annotation Thread

### Concept

Managers leave paragraph-level comments on a post during review, rather than just a rejection reason. Similar to Google Docs comments.

### MongoDB Schema

```js
// Collection: post_comments
{
  _id: ObjectId,
  postId: ObjectId,
  paragraphKey: String,    // Tiptap node ID or a stable paragraph hash
  authorId: ObjectId,
  body: String,
  isResolved: { type: Boolean, default: false },
  resolvedBy: ObjectId,
  resolvedAt: Date,
  replies: [
    {
      authorId: ObjectId,
      body: String,
      createdAt: Date
    }
  ],
  createdAt: Date
}
```

### Tiptap Integration

Tiptap supports custom node decorations. Use the `CommentMark` extension approach:
- Add a custom Tiptap extension that marks ranges of text with a `comment-id` attribute
- When a Manager clicks on a paragraph, they can open a comment box
- The frontend stores the `paragraphKey` (derived from the Tiptap node's position hash)

### API Routes

```
POST   /api/posts/:id/comments                      — Add a comment on a paragraph
GET    /api/posts/:id/comments                      — List all comments for a post
POST   /api/posts/:id/comments/:commentId/reply     — Reply to a comment
PATCH  /api/posts/:id/comments/:commentId/resolve   — Resolve a comment
DELETE /api/posts/:id/comments/:commentId           — Delete (Admin/Manager only)
```

### Admin Panel UI

- **Split view**: Editor on left, comment thread panel on right
- Highlighted paragraphs with comment indicators (yellow underline or side marker)
- Clicking a highlighted section scrolls the comment panel to that thread
- Resolved comments shown greyed out with a toggle to hide/show them

---

## Phase 11 — Media Library

### Concept

A shared, searchable asset store. When Editors upload images, they are catalogued in a `media_assets` collection. Any Editor can browse and reuse existing assets instead of uploading duplicates.

### MongoDB Schema

```js
// Collection: media_assets
{
  _id: ObjectId,
  uploadedBy: ObjectId,
  fileName: String,
  cloudinaryPublicId: String,   // For deletion/transformations via Cloudinary API
  url: String,                  // CDN URL
  thumbnailUrl: String,         // Cloudinary auto-generated thumbnail
  mimeType: String,
  sizeBytes: Number,
  width: Number,
  height: Number,
  altText: String,
  tags: [String],               // For filtering
  usedInPosts: [ObjectId],      // ref: posts (to prevent accidental deletion)
  deletedAt: Date,              // Soft delete
  createdAt: Date
}
```

### Backend

- When a direct Cloudinary upload completes, the frontend sends the response metadata to `POST /api/media` to register the asset
- Cloudinary webhook (optional): listen for deletions outside the CMS
- Before deleting an asset, check `usedInPosts` — warn if it's referenced

### API Routes

```
GET    /api/media            — List with filters (tags, uploader, date, search)
POST   /api/media            — Register new upload
PATCH  /api/media/:id        — Update altText, tags
DELETE /api/media/:id        — Soft delete (checks usedInPosts first)
```

### Admin Panel UI

- Grid view with thumbnail, file name, dimensions, size, uploader, date
- Search bar + tag filter chips
- Click to preview full-size, copy URL, or insert into current post
- Bulk delete (Admin only)

---

## Phase 12 — Reports & Analytics Dashboard

### Metrics to expose (Admin only)

| Widget | Data |
|--------|------|
| Posts by Status | Pie chart: draft / pending / approved / rejected |
| Posts Over Time | Line chart: publications per day/week/month |
| Top Editors by Output | Bar chart: posts submitted per editor |
| Approval Turnaround | Avg hours from `pending` → `approved` or `rejected` |
| Rejection Rate by Editor | Table sorted by rejection % |
| Category Distribution | Bar chart: posts per category |
| Manager Workload | Table: pending posts per manager |
| Active Users (30d) | Count of users who performed any action in last 30 days |

### Backend

Use MongoDB aggregation pipelines — no external analytics service needed.

**Example: Avg approval turnaround**
```js
Post.aggregate([
  { $match: { status: { $in: ['approved', 'rejected'] }, deletedAt: null } },
  { $project: {
      turnaroundHours: {
        $divide: [
          { $subtract: ['$reviewedAt', '$submittedAt'] },
          3600000 // ms → hours
        ]
      }
  }},
  { $group: { _id: null, avgTurnaround: { $avg: '$turnaroundHours' } } }
])
```

**Add to Post schema:**
```js
submittedAt: Date,   // Set when status → 'pending'
reviewedAt:  Date,   // Set when status → 'approved' or 'rejected'
publishedAt: Date,   // Set when status → 'published'
```

### API Routes

```
GET /api/admin/reports/overview          — Summary counts (posts, users, categories)
GET /api/admin/reports/posts-over-time   — Params: from, to, groupBy (day|week|month)
GET /api/admin/reports/editor-output     — Posts per editor
GET /api/admin/reports/turnaround        — Approval speed stats
GET /api/admin/reports/rejection-rate    — Per editor
GET /api/admin/reports/category-dist     — Posts per category
```

### Admin Panel UI

- Dashboard page with responsive card grid
- Charts: use `recharts` (already lightweight and React-native)
- Date range picker at top to filter all widgets simultaneously
- Export button per chart (CSV via `papaparse`)

---

## Recommended Third-Party Libraries

### Backend

| Purpose | Library | Why |
|---------|---------|-----|
| Job scheduling | `node-cron` | Lightweight, no separate process needed for small scale |
| Rate limiting | `express-rate-limit` | De-facto standard for Express |
| Rate limit persistence | `rate-limit-mongo` | Keeps limits across server restarts |
| Email | `nodemailer` + `@sendgrid/mail` | Already in your stack |
| Input validation | `joi` | Already in your stack |
| Date math | `date-fns` | Lightweight alternative to moment.js |

### Frontend (Admin Panel)

| Purpose | Library | Why |
|---------|---------|-----|
| Charts | `recharts` | React-native, composable, well-maintained |
| Date picker | `react-datepicker` | Simple, widely used, Tailwind-compatible |
| CSV export | `papaparse` | Already in your stack |
| Toast notifications | `react-hot-toast` | Minimal, no config, looks great |
| Diff viewer (revisions) | `react-diff-viewer` | Side-by-side old/new content comparison |
| Rich text comments | Tiptap custom extension | Build on existing Tiptap setup |
| Virtual list (media grid) | `react-window` | Performance for large media libraries |

---

## Database Migration Checklist

Run these changes in order. Each step should be a separate migration script in `/backend/src/migrations/`.

- [ ] `001_add_deletedAt_to_users.js` — Add `deletedAt`, `deletedBy` to User schema
- [ ] `002_add_deletedAt_to_posts.js` — Add `deletedAt`, `deletedBy` to Post schema
- [ ] `003_add_deletedAt_to_categories.js` — Same for Category
- [ ] `004_add_seo_fields_to_posts.js` — Add SEO sub-document
- [ ] `005_add_scheduling_to_posts.js` — Add `publishAt`, `status enum update`, `submittedAt`, `reviewedAt`, `publishedAt`
- [ ] `006_add_priority_breaking_to_posts.js` — Add `isBreaking`, `priority`, `breakingExpiresAt`
- [ ] `007_add_coauthors_to_posts.js` — Add `coAuthors` array, rename `authorId` → `primaryAuthorId`
- [ ] `008_create_indexes.js` — Compound indexes on `audit_logs`, TTL on `notifications` (90 days)

---

*Last updated: Phase 1–3 should be completed before any other feature work begins.*
*This document should be updated as phases are completed.*
