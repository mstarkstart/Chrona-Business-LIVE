# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chrona-live.spec.ts >> 2. Dashboard & Real-time Widgets >> 2b. Company progress ring is visible and has percentage
- Location: tests\chrona-live.spec.ts:80:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Company progress')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('text=Company progress')

```

```yaml
- alert
- banner:
  - link "Chrona Business":
    - /url: /
  - link "Sign in":
    - /url: /login
  - link "Get started →":
    - /url: /signup
- main:
  - list:
    - listitem: 1 Business Company info
    - listitem: 2 Account Owner account
    - listitem: 3 Employees Add coworkers
    - listitem: 4 Calendar Internal calendar
    - listitem: 5 Complete Launch portal
  - heading "Tell us about your business" [level=1]
  - paragraph: We will use this to set up your primary workspace and customize your tracking dashboard.
  - text: Business Name
  - textbox "Business Name":
    - /placeholder: e.g. Acme Corporation
  - text: Founding Date
  - textbox "Founding Date"
  - text: Business Type
  - button "Self Employed One-person operation"
  - button "Partnership Shared ownership business"
  - button "Corporation Separate legal entity"
  - text: Industry
  - button "💻 Technology"
  - button "🏥 Healthcare"
  - button "🍽️ Restaurant"
  - button "🛒 Retail"
  - button "🚗 Automotive"
  - button "🏢 Other Business"
  - text: Services / Description
  - textbox "Services / Description":
    - /placeholder: Tell us briefly about what services you offer...
  - text: Estimated Employees 5
  - slider: "5"
  - text: 1 25 50+ Estimated Teams 2
  - slider: "2"
  - text: 1 7 15+
  - button "Back"
  - button "Continue"
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
  29  |   await page.waitForURL(/dashboard/, { timeout: 10000 });
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
> 81  |     await expect(page.locator("text=Company progress")).toBeVisible();
      |                                                         ^ Error: expect(locator).toBeVisible() failed
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
  130 |     }
  131 |   });
  132 | 
  133 |   test("3b. Sidebar can collapse and expand", async ({ page }) => {
  134 |     // Click the collapse button
  135 |     await page.locator("button[title='Collapse sidebar']").click();
  136 |     await page.waitForTimeout(400); // wait for animation
  137 |     // Sidebar should be narrow now — check labels are hidden
  138 |     await expect(page.locator("span:has-text('My Work')").first()).toBeHidden();
  139 | 
  140 |     // Expand again
  141 |     await page.locator("button[title='Expand sidebar']").click();
  142 |     await page.waitForTimeout(400);
  143 |     await expect(page.locator("span:has-text('My Work')").first()).toBeVisible();
  144 |   });
  145 | 
  146 |   test("3c. Profile panel opens on avatar click", async ({ page }) => {
  147 |     await page.locator("#profile-quick-panel-trigger").click();
  148 |     await expect(page.locator("text=Edit full profile")).toBeVisible();
  149 |     await expect(page.locator("text=Sign out")).toBeVisible();
  150 |     await expect(page.locator("text=Appearance")).toBeVisible();
  151 |   });
  152 | 
  153 |   test("3d. Dark mode toggle works", async ({ page }) => {
  154 |     await page.locator("#profile-quick-panel-trigger").click();
  155 |     const html = page.locator("html");
  156 |     const initialClass = await html.getAttribute("class");
  157 | 
  158 |     // Click the theme toggle button
  159 |     await page.locator("button[title='Toggle theme']").click();
  160 |     await page.waitForTimeout(300);
  161 | 
  162 |     const newClass = await html.getAttribute("class");
  163 |     expect(newClass).not.toEqual(initialClass);
  164 |   });
  165 | 
  166 |   test("3e. Cmd+K opens command palette", async ({ page }) => {
  167 |     await page.keyboard.press("Control+k");
  168 |     await expect(page.locator("input[placeholder*='Search']").first()).toBeVisible({ timeout: 3000 });
  169 |     await page.keyboard.press("Escape");
  170 |   });
  171 | 
  172 |   test("3f. AI assistant drawer opens", async ({ page }) => {
  173 |     await page.locator("button[title='AI Assistant']").click();
  174 |     // The AI drawer should slide open
  175 |     await page.waitForTimeout(500);
  176 |     await expect(page.locator("text=AI Assistant").or(page.locator("text=Chrona AI"))).toBeVisible({ timeout: 3000 });
  177 |   });
  178 | 
  179 |   test("3g. Notification bell is visible", async ({ page }) => {
  180 |     await expect(page.locator("button[title*='notification']").or(page.locator("button[aria-label*='notification']"))).toBeVisible();
  181 |   });
```