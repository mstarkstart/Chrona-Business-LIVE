# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chrona-live.spec.ts >> 1. Authentication Flow >> 1a. Owner can log in and reach dashboard
- Location: tests\chrona-live.spec.ts:41:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Chrona Business" [ref=e5] [cursor=pointer]:
          - /url: /
          - img [ref=e7]
          - generic [ref=e9]: Chrona Business
        - generic [ref=e10]:
          - link "Sign in" [ref=e11] [cursor=pointer]:
            - /url: /login
          - link "Get started →" [ref=e12] [cursor=pointer]:
            - /url: /signup
            - text: Get started
            - generic [ref=e13]: →
    - main [ref=e14]:
      - generic [ref=e19]:
        - img [ref=e22]
        - heading "Welcome back" [level=1] [ref=e24]
        - paragraph [ref=e25]: Sign in to your Chrona workspace
        - generic [ref=e26]:
          - button "Google Soon" [disabled] [ref=e27]:
            - generic [ref=e28]:
              - img [ref=e29]
              - generic [ref=e34]: Google
            - generic [ref=e35]: Soon
          - button "Microsoft Soon" [disabled] [ref=e36]:
            - generic [ref=e37]:
              - img [ref=e38]
              - generic [ref=e43]: Microsoft
            - generic [ref=e44]: Soon
        - generic [ref=e49]: Or continue with email
        - generic [ref=e50]:
          - generic [ref=e51]:
            - text: Email
            - textbox "Email" [ref=e52]:
              - /placeholder: you@company.com
              - text: owner@pixelforge.test
          - generic [ref=e53]:
            - text: Password
            - textbox "Password" [ref=e54]:
              - /placeholder: ••••••••
              - text: TestPass123!
          - generic [ref=e55]:
            - generic [ref=e56] [cursor=pointer]:
              - checkbox "Remember me" [ref=e57]
              - generic [ref=e59]: Remember me
            - link "Forgot password?" [ref=e60] [cursor=pointer]:
              - /url: /forgot-password
          - button "Sign in" [active] [ref=e61] [cursor=pointer]:
            - text: Sign in
            - img [ref=e62]
        - paragraph [ref=e64]:
          - text: Don't have a business?
          - link "Create one →" [ref=e65] [cursor=pointer]:
            - /url: /signup
  - button "Open Next.js Dev Tools" [ref=e71] [cursor=pointer]:
    - generic [ref=e74]:
      - text: Rendering
      - generic [ref=e75]:
        - generic [ref=e76]: .
        - generic [ref=e77]: .
        - generic [ref=e78]: .
  - alert [ref=e79]
```

# Test source

```ts
  1   | /**
  2   |  * Chrona Platform — Full E2E Live Test Suite
  3   |  * ===========================================
  4   |  * Tests ALL features end-to-end with two user roles:
  5   |  *   User A: owner@pixelforge.test  (Owner/Admin — full access)
  6   |  *   User B: dev1@pixelforge.test   (Member — limited access)
  7   |  *
  8   |  * Password for all test users: TestPass123!
  9   |  *
  10  |  * Run: npx playwright test tests/chrona-live.spec.ts --headed
  11  |  * Run in UI mode: npx playwright test tests/chrona-live.spec.ts --ui
  12  |  */
  13  | 
  14  | import { test, expect, chromium, type Page, type BrowserContext } from "@playwright/test";
  15  | 
  16  | // ─── Config ────────────────────────────────────────────────────────────────────
  17  | const BASE_URL = "http://localhost:3000";
  18  | 
  19  | const USER_A = { email: "owner@pixelforge.test", password: "TestPass123!", name: "Olivia Carter", role: "Owner" };
  20  | const USER_B = { email: "dev1@pixelforge.test",  password: "TestPass123!", name: "Aiden Brooks",  role: "Member" };
  21  | 
  22  | // ─── Helpers ────────────────────────────────────────────────────────────────────
  23  | async function login(page: Page, user: typeof USER_A) {
  24  |   await page.goto(`${BASE_URL}/login`);
  25  |   await page.getByLabel(/email/i).fill(user.email);
  26  |   await page.getByLabel(/password/i).fill(user.password);
  27  |   await page.getByRole("button", { name: /sign in/i }).click();
  28  |   // Wait for redirect to dashboard
> 29  |   await page.waitForURL(/dashboard/, { timeout: 10000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  30  | }
  31  | 
  32  | async function logout(page: Page) {
  33  |   // Click bottom-left avatar
  34  |   await page.locator("#profile-quick-panel-trigger").click();
  35  |   await page.getByRole("button", { name: /sign out/i }).click();
  36  |   await page.waitForURL(/login/, { timeout: 5000 });
  37  | }
  38  | 
  39  | // ─── SUITE 1: Authentication ────────────────────────────────────────────────────
  40  | test.describe("1. Authentication Flow", () => {
  41  |   test("1a. Owner can log in and reach dashboard", async ({ page }) => {
  42  |     await login(page, USER_A);
  43  |     await expect(page).toHaveURL(/dashboard/);
  44  |     await expect(page.locator("h1")).toContainText(/Good/i);
  45  |   });
  46  | 
  47  |   test("1b. Unauthenticated user is redirected to login", async ({ page }) => {
  48  |     await page.goto(`${BASE_URL}/dashboard`);
  49  |     await page.waitForURL(/login/, { timeout: 5000 });
  50  |     await expect(page).toHaveURL(/login/);
  51  |   });
  52  | 
  53  |   test("1c. Member can log in and reach dashboard", async ({ page }) => {
  54  |     await login(page, USER_B);
  55  |     await expect(page).toHaveURL(/dashboard/);
  56  |   });
  57  | 
  58  |   test("1d. Login form rejects wrong password", async ({ page }) => {
  59  |     await page.goto(`${BASE_URL}/login`);
  60  |     await page.getByLabel(/email/i).fill(USER_A.email);
  61  |     await page.getByLabel(/password/i).fill("WrongPassword!");
  62  |     await page.getByRole("button", { name: /sign in/i }).click();
  63  |     // Should NOT redirect to dashboard
  64  |     await page.waitForTimeout(2000);
  65  |     await expect(page).not.toHaveURL(/dashboard/);
  66  |   });
  67  | });
  68  | 
  69  | // ─── SUITE 2: Dashboard ────────────────────────────────────────────────────────
  70  | test.describe("2. Dashboard & Real-time Widgets", () => {
  71  |   test.beforeEach(async ({ page }) => { await login(page, USER_A); });
  72  | 
  73  |   test("2a. Dashboard renders greeting, date, and role badge", async ({ page }) => {
  74  |     await expect(page.locator("h1")).toContainText(/Good (morning|afternoon|evening)/i);
  75  |     await expect(page.locator("text=Pixelforge Studio")).toBeVisible();
  76  |     // Role badge should say Owner
  77  |     await expect(page.locator("text=Owner")).toBeVisible();
  78  |   });
  79  | 
  80  |   test("2b. Company progress ring is visible and has percentage", async ({ page }) => {
  81  |     await expect(page.locator("text=Company progress")).toBeVisible();
  82  |     await expect(page.locator("text=% completed scope").first()).toBeVisible();
  83  |   });
  84  | 
  85  |   test("2c. Live Activity Stream is visible", async ({ page }) => {
  86  |     await expect(page.locator("text=Live Activity Stream")).toBeVisible();
  87  |     // Must show at least one team member
  88  |     await expect(page.locator("text=LIVE")).toBeVisible();
  89  |   });
  90  | 
  91  |   test("2d. Most efficient & Most loaded panels render", async ({ page }) => {
  92  |     await expect(page.locator("text=Most efficient")).toBeVisible();
  93  |     await expect(page.locator("text=Most loaded")).toBeVisible();
  94  |   });
  95  | 
  96  |   test("2e. Priority tasks section renders", async ({ page }) => {
  97  |     await expect(page.locator("text=Priority tasks")).toBeVisible();
  98  |   });
  99  | 
  100 |   test("2f. Leaderboard link is present", async ({ page }) => {
  101 |     await expect(page.locator("text=Team Leaderboard")).toBeVisible();
  102 |   });
  103 | 
  104 |   test("2g. Quick action Create Task button works", async ({ page }) => {
  105 |     await page.locator("text=Create Task").first().click();
  106 |     // Should navigate to tasks with new=1 param or show modal
  107 |     await page.waitForURL(/tasks/, { timeout: 5000 });
  108 |   });
  109 | });
  110 | 
  111 | // ─── SUITE 3: Navigation & Sidebar ──────────────────────────────────────────────
  112 | test.describe("3. Navigation & Sidebar", () => {
  113 |   test.beforeEach(async ({ page }) => { await login(page, USER_A); });
  114 | 
  115 |   test("3a. All nav items are clickable and lead to correct pages", async ({ page }) => {
  116 |     const navItems = [
  117 |       { label: "My Work", url: /tasks/ },
  118 |       { label: "Time Tracking", url: /timesheets/ },
  119 |       { label: "Projects", url: /projects/ },
  120 |       { label: "Calendar", url: /calendar/ },
  121 |       { label: "Inbox", url: /inbox/ },
  122 |       { label: "Organisation", url: /organisation/ },
  123 |       { label: "Settings", url: /settings/ },
  124 |     ];
  125 |     for (const item of navItems) {
  126 |       await page.goto(`${BASE_URL}/dashboard`);
  127 |       await page.locator(`a:has-text("${item.label}")`).first().click();
  128 |       await page.waitForURL(item.url, { timeout: 6000 });
  129 |       await expect(page).toHaveURL(item.url);
```