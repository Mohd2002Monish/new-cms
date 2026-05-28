# News CMS & Portal

A comprehensive, production-ready full-stack **News Content Management System (CMS)** and **Public-Facing News Portal** designed for modern digital newsrooms.

This repository features three primary packages:
1. **`backend`**: Node.js/Express REST API with MongoDB, JWT authentication (with 2FA/OTP), WebSockets, and Cloudinary media uploading.
2. **`frontend`**: React (via Vite) & Tailwind CSS admin portal for Editors, Managers, and Admins featuring a rich Tiptap editor with collaborative commenting, real-time revision tracking, and interactive analytics.
3. **`public-frontend`**: Next.js public-facing speed-optimized news website for readers, with live hero sliders, bookmarking, dynamic reading progression, semantic SEO structure, and dark mode toggling.

---

## 📂 Project Architecture

```
news-cms/
├── backend/            # Express.js REST API server
├── frontend/           # React Admin CMS Dashboard (Vite)
├── public-frontend/    # Next.js Public-Facing News Website
└── README.md           # This project guide
```

---

## ⚡ Tech Stack Summary

### Backend (`/backend`)
* **Runtime**: Node.js & Express.js
* **Database**: MongoDB (Mongoose ODM)
* **Real-time Engine**: Socket.io (pushing notifications, live collaborative revisions)
* **Auth**: JWT (with short-lived access tokens and secure HTTP-Only Refresh cookies) + Two-Factor Authentication (OTP via Email/SMS)
* **Validation**: Joi (strict request payload schemas)
* **Storage**: Cloudinary API (via pre-signed signature generation directly on client)

### Admin CMS (`/frontend`)
* **Framework**: React (Vite) with React Router v6
* **State Management**: Redux Toolkit & RTK Query
* **Styling**: Tailwind CSS
* **Text Editor**: Tiptap Rich Text editor (configured with custom inline comments, revision history, and direct drag-and-drop file uploads)
* **Data Visualization**: Recharts (editorial volume, rejection rates, workload logs)

### Public News Portal (`/public-frontend`)
* **Framework**: Next.js (App Router)
* **SEO**: Dynamic Site-mapping, JSON-LD Structured Data, and Semantic HTML5 layout
* **Styling**: Custom CSS & Tailwind CSS (includes native CSS Theme variables for Light/Dark modes)
* **Interactions**: Client-side bookmarks (local storage), dynamic article reactions, reading progress trackers, and real-time page-view counters

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** (or yarn/pnpm)
* **MongoDB** (Local instance or MongoDB Atlas account)
* **Cloudinary Account** (For media asset library)

### 1. Setup Backend API
1. Open the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` with your database URI, Cloudinary credentials, and Mailer keys.
4. Seed the initial root Admin user:
   ```bash
   node scripts/seed-admin.js
   ```
5. Start development server:
   ```bash
   npm start
   ```

### 2. Setup CMS Admin Panel
1. Open the admin frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment configuration:
   ```bash
   cp .env.example .env
   ```
   Specify your backend API endpoint URL (usually `http://localhost:5000/api`).
4. Start local development server:
   ```bash
   npm run dev
   ```

### 3. Setup Public Portal
1. Open the public website directory:
   ```bash
   cd ../public-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment configuration:
   ```bash
   cp .env.example .env.local
   ```
4. Run Next.js server locally:
   ```bash
   npm run dev
   ```

---

## 🔒 Security Practices
* **HTTP-only Cookies**: Refresh tokens are stored securely to prevent cross-site scripting (XSS) extraction.
* **Granular Overrides**: Roles (`admin`, `manager`, `editor`) can have strict, document-level override rules.
* **Rate-limiting**: Built-in authentication rate-limiting blocks brute force attempts, storing active limit blocks in MongoDB.
* **NoSQL Injection Guard**: Strict Mongoose schema casting and Joi validations sanitise all parameters before runtime execution.

---

## 📄 Documentation Details
For detailed system specs, workflows, API endpoint paths, and design choices, view the full [DOCUMENTATION.md](file:///Users/mohd2002monish/Documents/GitHub/news-cms/DOCUMENTATION.md).
