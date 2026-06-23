# Chrona Business — Architecture & Implementation Guide

This document provides a comprehensive overview of the architecture, data structures, real-time sync systems, and deployment configurations for the Chrona Business platform.

---

## 🚀 Tech Stack Overview

* **Frontend Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS + Custom Vanilla CSS for glassmorphism and animations
* **Database & Auth**: Supabase (PostgreSQL, GoTrue Auth, Storage, Realtime engine)
* **AI Engine**: Gemini API / OpenRouter (Chrona Nexus Assistant)
* **Email Dispatch**: NodeMailer (SMTP Transport)
* **Hosting**: Vercel (Serverless Edge Functions)

---

## 📁 Repository Structure

```
chrona-work/
├── app/                      # Next.js App Router paths
│   ├── (marketing)/          # Public landing, onboarding, login/signup wizard
│   ├── (app)/                # Protected workspace dashboard, tasks, calendar, team hub
│   ├── api/                  # Server-side API endpoints (real-time chat, notifications)
│   └── auth/callback/        # Supabase auth redirection handler
├── components/               # Shared React Components
│   ├── ui/                   # Reusable premium UI elements (animations, glassmorphism)
│   ├── shell/                # App layout frames: Sidebars, Topbar, Notification Bell
│   ├── chat/                 # Chat windows, input anchors, notification badges
│   └── dashboard/            # Dynamic progress rings, charts, and activity streams
├── lib/                      # Business logic, state, database clients, and helpers
│   ├── supabase/             # Client, Server, and Admin client configurations
│   ├── auth/                 # Roles, RBAC matrices, and session management
│   └── dashboard/            # Heuristic calculation algorithms (efficiency/overload)
├── scripts/                  # Administrative and developer tools
│   ├── seed-accounts.ts      # Database seeding script for QA test accounts
│   ├── verify-supabase.ts    # Live database schema verification script
│   └── setup-storage.ts      # Automatic avatar storage bucket setup
└── supabase/                 # Database schema and migrations
    ├── migrations/           # Chronological SQL migration files (0001 to 0015)
    └── setup.sql             # Full database schema blueprint
```

---

## 🔑 Environment Variables (`.env.local`)

To run the application locally or in production (Vercel), configure the following variables:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=                 # Your Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # Supabase Publishable Key (custom proxy key)
SUPABASE_SERVICE_ROLE_KEY=               # Service Role Secret Key (admin access)

# AI Engine
OPENROUTER_API_KEY=                      # Gemini / OpenRouter API key for Nexus Assistant

# SMTP Email Configuration (Nodemailer)
SMTP_USER=                               # SMTP server username (sender email)
SMTP_PASS=                               # SMTP application-specific password
FROM_EMAIL=                              # Display name sender email

# Application Host URL
NEXT_PUBLIC_APP_URL=                     # http://localhost:3000 (Local) or your Vercel URL (Prod)
```

---

## ⚡ Real-Time Architecture

Chrona is designed to feel alive with instant sync. It implements this using two core patterns:

### 1. Supabase Realtime Channels (WebSockets)
* **Live Activity Stream**: Tracks user status pickers, presence, and last active timestamps. When a user changes their status to "In a Meeting", a WebSocket payload is pushed to all active clients in the workspace, updating the sidebar avatar glows and timers instantly.
* **Team Chat**: Real-time team chat messages are broadcasted via `supabase_realtime` and inserted in `/api/chat/send` to ensure sub-second delivery.
* **Notification Badges**: Sidebar indicators (e.g., chat red dots, inbox badges) listen to database insert events on their respective tables, updating immediately.

### 2. Next.js Server Components + Revalidation
* Metrics like the **Company Progress Bar** and **Dashboard Progress Rings** use server-side heuristics.
* We implement a `<DashboardRealtimeSync />` client component that listens for task updates. When a task is completed, it triggers an instant router revalidation (`router.refresh()`), causing the server component to recalculate metrics and push the fresh UI to the user without a page refresh.

---

## 📦 Supabase Database Schema

The database is structured around standard relational PostgreSQL constraints. Core schemas include:

1. **`workspaces`**: Workspace metadata and business types (`self_employed`, `partnership`, `corporation`).
2. **`profiles`**: User details, preferred names, and avatar URLs.
3. **`workspace_members`**: Linking table mapping users to workspaces, enforcing Roles-Based Access Control (Owner, Admin, Manager, Member, Guest).
4. **`projects`**: Custom project boards containing a `deadline` date and `privacy` properties.
5. **`tasks`**: Work items containing priorities (`urgent`, `high`, `normal`, `low`), statuses (`pending`, `in_progress`, `completed`, `awaiting_approval`), and assignments.
6. **`calendar_events`**: Individual and team schedule items with support for a `description` field.
7. **`chat_messages`**: Central chat history containing the message `body` (limit 2000 chars) and workspace scopes.

---

## 🛠️ Developer Scripts

Run these scripts from your terminal inside the project root:

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run TypeScript compilation & build production package
npm run build

# Seed default QA accounts (oliver@chrona.test & aidenb@chrona.test)
npx tsx scripts/seed-accounts.ts

# Verify live Supabase schema configuration
npx tsx scripts/verify-supabase.ts

# Setup avatar storage bucket and policies
npx tsx scripts/setup-storage.ts
```

---

## 🌐 Production Vercel Deployment

1. **Import Repository**: Connect your GitHub repository to Vercel.
2. **Add Environment Variables**: Paste all keys from your `.env.local` file into the Vercel Project Settings.
3. **Configure Function Region**: 
   * Go to **Settings** -> **Functions** in Vercel.
   * Change the **Function Region** to match the exact region of your Supabase database. This is critical to reduce database roundtrip latency from 1.5s to under 100ms.
4. **Deploy**: Trigger the build. Vercel will compile the optimized pages and deploy the application globally.
