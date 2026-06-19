# Chrona Business — Application Overview

Welcome to **Chrona Business**, a workforce productivity platform built with Next.js, Supabase, Tailwind CSS, and OpenRouter AI. Chrona provides real-time activity tracking, automated and manual task delegation, point-based gamified rewards, and smart scheduling.

---

## 🌟 What Chrona Can Do & Is Doing for Everyone

Here is a breakdown of what the application does and the specific interface and capability sets provided for each workspace role:

### 1. For Everyone (All Workspace Members)
* **Real-time Status Tracking & Presence**: 
  - Set custom activity statuses (e.g., *Available*, *Tasking*, *Meeting*, *Lunch Break*, *Personal Time*, *Training*, *Offline*) in the right sidebar.
  - Teammates' real-time statuses are synced instantly via Supabase Presence.
  - When sidebars are collapsed, everyone's active status and name is fully visible when hovering over their respective status dots.
* **Smart Calendar View**: Fully responsive Calendar displaying upcoming deadlines and schedules.
* **Collaborative Real-time Chat**: Connect with teammates instantly.
* **Document Management (Docs)**: Save, edit, and keep notes on local storage.
* **AI Assistant (Chrona Nexus)**:
  - Streaming AI companion in the top right drawer.
  - Can fetch current tasks and teammates to answer context-aware questions.
  - Can create tasks or draft notes on behalf of the user when asked (e.g., *"Create a task: Update presentation"*).

### 2. For Employees (Members & Guests)
* **Personalized Dashboard**:
  - Focuses on individual progress with circular rings showing task completion percentage.
  - Quick access to "My upcoming tasks" and priority items.
* **"My Work" view on Tasks Page**: A simplified task list for starting, tracking, and finishing assigned tasks.

### 3. For Managers, Owners & C-Suite
* **Workspace Management**:
  - Full aggregate overview of company-wide task completion metrics.
  - View "Most Efficient" and "Most Loaded" teammates (identifying potential burnout).
* **Workload-Aware Task Delegation**:
  - **Manual Assignment**: Easily assign pending tasks to active team members.
  - **Smart Recommendations**: The system automatically recommends members with the lowest current workload for task assignment.
  - **Available Windows Finder**: Find available times/slots in team members' calendars over the next 7 days.
* **Approvals Hub**: Review and approve task completion requests or delegation changes before they are finalized.

---

## ⚙️ Settings: UI Customization
Chrona features a **progressive disclosure** settings module:
* **Simple Mode**: Hides complex developer options and automations, providing a clean focus-oriented workspace.
* **Advanced Mode**: Expands settings to reveal Automations (conditional rules) and Developer options (API keys, webhooks).
* *Note: When toggled, the setting saves automatically to your profile in Supabase and instantly refreshes the page to update the layout.*

---

## 🚀 Suggested Future Features

Here are proposed advanced features that could be added to Chrona to further improve its capability:

### 1. 📅 Google Calendar & Outlook Integration
* **Double-Sync**: Let users link Google Calendar or Outlook. 
* **Benefit**: The "Available Windows" utility and AI assistant will be able to query external schedules to find the absolute best meetings slots without schedule conflicts.

### 2. ⚡ AI Automations & Autopilot
* **Self-Assigning Triggers**: Let the AI automatically assign newly created tasks based on team capacity.
* **Daily Standup Summarizer**: The AI can compile daily presence and task progress logs into a Slack/Email summary for management every afternoon.

### 3. 📊 Advanced Productivity Analytics
* **Performance Charts**: Line and bar graphs depicting completed tasks and average cycle time per team or department.
* **Focus Time Analytics**: Track time spent in "Tasking" vs "Meeting" statuses to optimize focus blocks.

### 4. 🔔 Interactive Notifications & Push Support
* **Real-time Push Notifications**: Send system notifications directly to browsers or mobile devices when a task is assigned, approved, or commented on.
* **Slack / Discord Webhooks**: Channel notifications for task updates.
