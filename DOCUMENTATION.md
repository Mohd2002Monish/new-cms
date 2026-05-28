# News CMS Documentation

Welcome to the comprehensive documentation for the **News CMS**, a full-stack, robust Content Management System specifically built to serve the operational and editorial needs of digital newsrooms.

This document breaks down the system's architecture, frontend and backend structures, deployment considerations, and role-based workflows.

---

## 1. System Overview

The News CMS manages the entire lifecycle of a news article: from drafting by Editors, to review and approval by Managers, and system-wide oversight by Admins.

### Tech Stack
* **Frontend**: React (via Vite), Redux Toolkit, Tailwind CSS, Tiptap (Rich Text), Recharts, React Router v6.
* **Backend**: Node.js, Express.js.
* **Database**: MongoDB (via Mongoose), hosted on MongoDB Atlas.
* **Authentication**: JWT (JSON Web Tokens), `bcrypt` for hashing, Two-Factor Authentication (OTP via email/SMS).
* **Media Storage**: Cloudinary.
* **Real-time Engine**: Socket.io (for live collaboration and notifications).

---

## 2. Architecture & Design Patterns

### Client-Server Flow
The system operates as an SPA (Single Page Application) communicating via a RESTful API.
1. The **React frontend** sends requests using `axios` with interceptors that automatically attach JWT tokens.
2. The **Express backend** validates incoming data using `Joi`, verifies authentication/authorization via custom middleware, and interacts with MongoDB.

### Data Security & Validation
* **Rate Limiting**: Applied to sensitive endpoints (like login/OTP) using `rate-limit-mongo`.
* **Input Validation**: All POST/PUT requests are strictly validated against Joi schemas before reaching the controllers.
* **Sanitization**: Mongoose prevents NoSQL injection attacks.

---

## 3. Backend Architecture

### Directory Structure (`/backend`)
* `/src/controllers/`: Business logic handlers for each route.
* `/src/models/`: Mongoose schemas defining the database structure.
* `/src/routes/`: Express router definitions.
* `/src/middleware/`: Custom middleware for authentication, authorization, and validation.
* `/src/services/`: External integrations (e.g., Cloudinary uploads, Email/SMS dispatching).
* `/scripts/`: Utility scripts (e.g., seeding the initial admin user).

### Core Collections & Models
1. **User**: Manages credentials, roles (`admin`, `manager`, `editor`), status (active/suspended), and granular permission overrides.
2. **Post**: The core article document. Contains title, JSON content (Tiptap output), HTML content, author relations, status state machine, and publishing schedules.
3. **Category**: Manages site-wide post categories (e.g., Politics, Sports).
4. **AuditLog**: Immutable ledger of critical system actions (e.g., user creations, permission changes, post approvals).
5. **Notification**: In-app notifications pushed to users via Socket.io.

### API Endpoints
* `/api/auth`: Login, OTP generation and verification, token refreshing.
* `/api/users`: CRUD operations for users, role assignments, suspension.
* `/api/posts`: Article drafting, fetching, submitting, approving, rejecting.
* `/api/categories`: Category management.
* `/api/media`: Pre-signing Cloudinary upload URLs for direct client-to-cloud uploads.
* `/api/reports`: Aggregation pipelines serving the analytics dashboard.
* `/api/audit-logs`: Fetching system activity ledgers.

---

## 4. Frontend Architecture

### Directory Structure (`/frontend`)
* `/src/components/`: Reusable UI elements (Layout, Sidebar, Modals, MediaLibrary).
* `/src/pages/`: Main route views (PostEditor, Dashboard, Reports, etc.).
* `/src/features/`: Redux slices (Auth, Notifications, Posts).
* `/src/extensions/`: Custom Tiptap extensions (e.g., CommentMark for inline editor comments).
* `/src/services/`: API configuration (`api.js` Axios instance).

### Key Pages & Features

#### 1. The Post Editor (`PostEditor.jsx`)
The crown jewel of the application.
* **Tiptap Integration**: Offers a block-based rich text editing experience.
* **Split-Screen Preview**: A live side-by-side preview renders the article exactly as it will appear on the public frontend.
* **Inline Threaded Comments**: Managers and editors can highlight specific paragraphs and leave threaded feedback to request revisions.
* **Revision History**: Auto-saves drafts and tracks version history, allowing users to preview and restore previous versions.
* **Direct Media Uploads**: Users can drag and drop images directly into the editor. The frontend fetches a signature from the backend and uploads directly to Cloudinary.

#### 2. Analytics Dashboard (`Reports.jsx`)
A comprehensive suite of charts built with `Recharts`.
* Tracks publication volume over time.
* Measures average editorial turnaround time.
* Displays "Editor Quality" metrics (Rejection Rates).
* Visualizes Manager workload queues (Pending Approvals).

#### 3. User & Permission Management (`UserManagement.jsx`, `Permissions.jsx`)
* **Role-Based Views**: Managers can only see and manage Editors assigned to them. Admins see everyone.
* **Granular Overrides**: Admins can override specific permissions (e.g., allowing a specific Editor to bypass the approval queue and publish directly).

#### 4. Audit & System Logs (`AuditLogs.jsx`, `RateLimits.jsx`)
* **Diff Tracking**: The Audit Log system saves the "Previous State" and "New State" of database entities during updates, allowing admins to see exactly what changed in JSON format.
* **Rate Limits**: Admins can view actively throttled IP addresses and manually clear them if needed.

---

## 5. Editorial Workflow Lifecycle

The CMS enforces a strict state machine for content:
1. **Draft (`draft`)**: The Editor creates the post. Auto-saves periodically.
2. **Pending Approval (`pending_approval`)**: The Editor submits the post. The post becomes read-only for the Editor.
3. **Manager Review**:
   * **Approve (`live` / `scheduled`)**: The Manager approves the post. It goes live immediately or at a scheduled time.
   * **Reject (`rejected`)**: The Manager rejects the post, providing a reason or leaving inline comments. The Editor regains write access to make fixes.

---

## 6. Security Considerations

* **Two-Factor Authentication**: Enforced globally. Even if a password is breached, the attacker needs access to the user's email or phone.
* **Token Expiration**: Access tokens are short-lived (15 minutes). The frontend transparently uses the HTTP-only Refresh Cookie to get new tokens, preventing XSS attacks from stealing long-lived credentials.
* **Authoritative Role Checks**: All protected routes enforce strict backend checks. Even if the frontend UI is manipulated, the backend will reject unauthorized requests.

---

## 7. Development & Deployment

### Local Development
1. Start the MongoDB server.
2. Run `npm install` in both `/backend` and `/frontend`.
3. Create `.env` files based on `.env.example`.
4. Run `node scripts/seed-admin.js` to create the initial root user.
5. Use `npm run dev` in both directories to start the Vite HMR server and the Nodemon backend server.

### Production Build
1. Build the React app: `cd frontend && npm run build`.
2. The `dist` folder can be served directly by the Express backend, or (preferably) hosted on a CDN/Static Host like Vercel or AWS S3.
3. The Express backend should be deployed to a Node.js hosting environment (e.g., Render, Heroku, AWS EC2) with PM2 for process management.
