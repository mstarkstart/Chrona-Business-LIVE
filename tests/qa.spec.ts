import { test, expect } from "@playwright/test";

const PASSWORD = "TestPass123!";

test.describe("Chrona Business E2E QA Test Suite", () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage/login
    await page.goto("/login");
  });

  test("Scenario 1: Authenticate as Employer and verify Dashboard UI", async ({ page }) => {
    // Login
    await page.fill('#email', 'owner@pixelforge.test');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    // Expected: Redirects to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify Dashboard metric elements
    await expect(page.locator('text=Company progress')).toBeVisible({ timeout: 15000 });
    
    // Expand right sidebar if collapsed (check for expand button)
    const expandBtn = page.locator('button[title="Expand Sidebar"]');
    try {
      if (await expandBtn.isVisible({ timeout: 2000 })) {
        await expandBtn.click({ force: true });
      }
    } catch (e) {}

    // Logout
    // Locate the profile quick panel trigger at the bottom left
    const profileBtn = page.locator('#profile-quick-panel-trigger');
    if (await profileBtn.count() > 0) {
      await profileBtn.click();
      await page.click('text=Sign out');
    } else {
      await page.goto("/login");
    }
  });

  test("Scenario 2: Status Picker & Presence Syncing", async ({ page }) => {
    // Login as Employee
    await page.fill('#email', 'dev1@pixelforge.test');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Expand right sidebar if collapsed (check for expand button)
    const expandBtn = page.locator('button[title="Expand Sidebar"]');
    try {
      if (await expandBtn.isVisible({ timeout: 2000 })) {
        await expandBtn.click({ force: true });
      }
    } catch (e) {}

    // Locate status picker button
    const statusPicker = page.getByRole('button', { name: /Available|Tasking|Meeting|Lunch break/i }).first();
    await expect(statusPicker).toBeVisible();
    await statusPicker.click();

    // Click 'Meeting' in the dropdown popover
    await page.click('text=Meeting');

    // Wait for the status indicator to update to Meeting (Orange)
    await expect(page.locator('button:has-text("Meeting")').first()).toBeVisible({ timeout: 5000 });

    // Clean up: change status back to Available
    await page.locator('button:has-text("Meeting")').first().click();
    await page.click('text=Available');
    await expect(page.locator('button:has-text("Available")').first()).toBeVisible({ timeout: 5000 });
  });

  test("Scenario 3 & 4: Task Lifecycle, Auto-Status Switching, and Approvals", async ({ page, browser }) => {
    const taskTitle = `QA Test - ${Date.now()}`;

    // --- STEP 1: Log in as Employer to create and assign the task ---
    await page.fill('#email', 'owner@pixelforge.test');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to tasks page
    await page.goto("/tasks");
    
    // Click 'Create task' button
    await page.click('button:has-text("Create task"), button:has-text("New Task")');

    // Fill task modal
    await page.fill('input[name="title"]', taskTitle);
    await page.fill('textarea[name="description"]', 'This is a description for the automated QA test task.');
    await page.selectOption('select[name="assigned_to"]', { label: 'Aiden Brooks' });
    await page.check('input[name="requires_approval"]');
    
    // Submit task creation
    await page.click('button[type="submit"]:has-text("Create task")');

    // Wait for task to be created (modal closes)
    await expect(page.locator('button[type="submit"]:has-text("Create task")')).not.toBeVisible({ timeout: 10000 });

    // Logout Employer
    await page.goto("/login"); // Direct redirect to clear session safely
    
    // --- STEP 2: Log in as Employee to accept the task ---
    const employeeContext = await browser.newContext();
    const employeePage = await employeeContext.newPage();
    await employeePage.goto("/login");
    await employeePage.fill('#email', 'dev1@pixelforge.test');
    await employeePage.fill('#password', PASSWORD);
    await employeePage.click('button[type="submit"]');
    await expect(employeePage).toHaveURL(/\/dashboard/);

    // Check notification bell badge and click it
    const notificationBell = employeePage.locator('button:has(.bg-red-500), button:has(.rounded-full)');
    await expect(notificationBell.first()).toBeVisible();
    await notificationBell.first().click();

    // Find the task assignment notification and click 'Accept'
    const acceptBtn = employeePage.locator(`button:has-text("Accept")`);
    await expect(acceptBtn.first()).toBeVisible({ timeout: 10000 });
    await acceptBtn.first().click();

    // Wait for notification panel action to complete
    await expect(acceptBtn).not.toBeVisible();

    // Go to /tasks page
    await employeePage.goto("/tasks");

    // Locate the newly created task card / row
    const taskRow = employeePage.locator(`text=${taskTitle}`).locator('xpath=../..');
    
    // Click the 'Start' button
    const startBtn = employeePage.locator('button:has-text("Start")').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify Employee status auto-switches to 'Tasking'
    const employeeStatus = employeePage.locator('button:has-text("Tasking")');
    await expect(employeeStatus.first()).toBeVisible({ timeout: 5000 });

    // Click 'Done' button
    const doneBtn = employeePage.locator('button:has-text("Done")').first();
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    // Verify Employee status auto-reverts to 'Available'
    const employeeRevertedStatus = employeePage.locator('button:has-text("Available")');
    await expect(employeeRevertedStatus.first()).toBeVisible({ timeout: 5000 });

    // Close employee page
    await employeePage.close();

    // --- STEP 3: Return to Employer to approve the task ---
    await page.goto("/tasks");
    
    // Expected: the approvals section contains the task
    const approveTaskBtn = page.locator('button:has-text("Approve")').first();
    await expect(approveTaskBtn).toBeVisible({ timeout: 10000 });
    await approveTaskBtn.click();

    // Verify it is approved successfully (moves from approvals section)
    await expect(approveTaskBtn).not.toBeVisible();
  });

  test("Scenario 5: Calendar Scheduling", async ({ page }) => {
    // Login as Employee
    await page.fill('#email', 'dev1@pixelforge.test');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Calendar page
    await page.goto("/calendar");

    // Verify the 'New event' form is visible
    await expect(page.locator('text=Quick Schedule').first()).toBeVisible();

    const eventTitle = `Meeting - ${Date.now()}`;
    await page.fill('input[placeholder="Event title"], input[name="title"]', eventTitle);
    
    // Set start/end times
    const startInput = page.locator('input[name="start_at"]');
    if (await startInput.count() > 0) {
      const todayISO = new Date().toISOString().slice(0, 16); // yyyy-MM-ddThh:mm
      await startInput.fill(todayISO);
      const endInput = page.locator('input[name="end_at"]');
      const endISO = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
      await endInput.fill(endISO);
    }
    
    // Click Create Event button
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Add")');

    // Go to Week view to verify rendering
    await page.goto("/calendar/week");
    
    // Verify event is visible on calendar week view
    await expect(page.locator(`text=${eventTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test("Scenario 6: Department Creation & Partnership Approvals (Bella's Auto)", async ({ page }) => {
    // Login as Bella (Partner-Owner)
    await page.fill('#email', 'bella@bellasauto.test');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Organisation -> Departments page
    await page.goto("/organisation/departments");

    const deptName = `Wash & Detail - ${Date.now()}`;
    await page.fill('input[placeholder="Department name"], input[name="name"]', deptName);
    await page.click('button:has-text("Add"), button:has-text("Create")');
    await page.waitForTimeout(3000); // Wait for API submission to finish

    // Expected: Requires approval and goes to approvals page
    await page.goto("/approvals");
    await expect(page.locator(`text=${deptName}`)).toBeVisible({ timeout: 10000 });

    // Click Approve
    const approveBtn = page.locator(`button:has-text("Approve")`).first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify it is approved and goes away from the approvals list
    await expect(page.locator(`text=${deptName}`)).not.toBeVisible({ timeout: 15000 });

    // Navigate back to departments page and check it's now listed
    await page.goto("/organisation/departments");
    await expect(page.locator(`text=${deptName}`)).toBeVisible();
  });
});
