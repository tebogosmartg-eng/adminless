import { expect, test, type Page } from "@playwright/test";

const TEST_EMAIL = process.env.PLAYWRIGHT_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_PASSWORD;

function assertCredentialsPresent() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD to run smoke tests.");
  }
}

async function attachRuntimeGuards(page: Page, errors: string[]) {
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  page.on("response", (response) => {
    if (response.status() !== 400) return;
    const url = response.url();
    if (!url.includes("supabase.co") && !url.includes("127.0.0.1") && !url.includes("localhost")) return;
    errors.push(`[http400] ${response.request().method()} ${url}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon")) {
        // Chromium logs this for failed network requests; we capture actionable detail via [http400] above.
        if (text.includes("Failed to load resource") && text.includes("status of 400")) return;
        errors.push(`[console.error] ${text}`);
      }
    }
  });
}

async function assertNoRuntimeErrors(errors: string[]) {
  expect(errors, `Unexpected runtime errors:\n${errors.join("\n")}`).toEqual([]);
}

async function assertNoStuckLoading(page: Page) {
  await expect(page.getByText("Loading Workspace...")).toHaveCount(0);
  await expect(page.getByText("Generating PDF...")).toHaveCount(0);
}

async function login(page: Page) {
  assertCredentialsPresent();
  await page.goto("/login");
  console.log("[E2E] logging in with:", process.env.PLAYWRIGHT_EMAIL);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
  const passwordInput = page
    .locator('input[type="password"], input[name="password"], input[autocomplete="current-password"]')
    .first();
  const submitButton = page
    .locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')
    .first();

  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await expect(passwordInput).toBeVisible({ timeout: 15_000 });
  await expect(submitButton).toBeVisible({ timeout: 15_000 });

  await emailInput.fill(TEST_EMAIL!);
  await passwordInput.fill(TEST_PASSWORD!);
  await submitButton.click();
  console.log("[E2E] login submitted");

  const invalidLoginMessage = page.getByText(/invalid login credentials/i);
  const authOutcome = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 })
      .then(() => "success" as const),
    invalidLoginMessage.waitFor({ state: "visible", timeout: 30_000 }).then(() => "invalid" as const),
  ]);

  if (authOutcome === "invalid") {
    const errorText = (await invalidLoginMessage.textContent())?.trim() ?? "Invalid login credentials";
    console.error("[E2E] Login failed:", errorText);
    throw new Error(`[E2E] Login failed: ${errorText}`);
  }

  await expect(page.getByRole("heading", { name: /dashboard|classes/i })).toBeVisible({ timeout: 30_000 });
}

async function openFirstClass(page: Page) {
  await page.goto("/classes");
  await expect(page.getByRole("heading", { name: "Classes", exact: true })).toBeVisible();
  const firstClass = page.locator("text=/\\d+ learners/").first();
  await expect(firstClass).toBeVisible({ timeout: 20_000 });
  await firstClass.click();
  await page.waitForURL(/\/classes\/.+/, { timeout: 20_000 });
  await expect(page.getByRole("tab", { name: "Assessments" })).toBeVisible();
}

async function exportPdfFromReports(page: Page, buttonName: RegExp | string) {
  await page.getByRole("tab", { name: "Reports" }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 25_000 });
  await page.getByRole("button", { name: buttonName }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
}

test.describe("Teacher critical smoke flows", () => {
  test("capture marks -> open diagnostics -> export PDF", async ({ page }) => {
    const runtimeErrors: string[] = [];
    await attachRuntimeGuards(page, runtimeErrors);
    await login(page);
    await openFirstClass(page);

    const firstMarkInput = page.locator('table tbody input[placeholder="-"]:not([disabled])').first();
    await expect(firstMarkInput).toBeVisible({ timeout: 20_000 });
    await firstMarkInput.fill("13");
    await firstMarkInput.blur();
    await expect(firstMarkInput).toHaveValue("13");

    await page.getByRole("tab", { name: "Reports" }).click();
    await page.getByRole("button", { name: "Diagnostic Report" }).click();
    await expect(page.getByRole("heading", { name: "Diagnostic Analysis Report" })).toBeVisible();

    const diagnosticExport = page.getByRole("button", { name: "Export Official PDF" });
    if (await diagnosticExport.isEnabled()) {
      const downloadPromise = page.waitForEvent("download", { timeout: 25_000 });
      await diagnosticExport.click();
      const download = await downloadPromise;
      expect(await download.failure()).toBeNull();
    } else {
      await page.keyboard.press("Escape");
      await exportPdfFromReports(page, "Class Marksheet (PDF)");
    }

    await assertNoStuckLoading(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("capture attendance -> daily/monthly switch -> export", async ({ page }) => {
    const runtimeErrors: string[] = [];
    await attachRuntimeGuards(page, runtimeErrors);
    await login(page);
    await openFirstClass(page);

    await page.getByRole("tab", { name: "Register" }).click();
    await expect(page.getByRole("heading", { name: "Daily Register" })).toBeVisible();
    // Wait for fetch to finish — header counts stay mounted during loading and can briefly show stale zeros.
    await expect(page.getByRole("table")).toBeVisible({ timeout: 25_000 });

    const presentCounter = page.locator(".text-green-600.font-medium span").first();
    const before = await presentCounter.textContent();

    await page.getByRole("tab", { name: "Monthly Grid" }).click();
    await expect(page.getByRole("heading", { name: "Monthly Overview" })).toBeVisible();
    await page.getByRole("tab", { name: "Daily Register" }).click();
    await expect(page.getByRole("heading", { name: "Daily Register" })).toBeVisible();
    await expect(presentCounter).toHaveText((before ?? "").trim());

    const downloadPromise = page.waitForEvent("download", { timeout: 25_000 });
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Monthly PDF" }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();

    await assertNoStuckLoading(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("edit learner comment -> save -> export PDF", async ({ page }) => {
    const runtimeErrors: string[] = [];
    await attachRuntimeGuards(page, runtimeErrors);
    await login(page);
    await openFirstClass(page);

    const firstMarkInput = page.locator('table tbody input[placeholder="-"]:not([disabled])').first();
    await expect(firstMarkInput).toBeVisible({ timeout: 20_000 });
    await firstMarkInput.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Observation" }).click();

    const comment = `Smoke note ${Date.now()}`;
    const noteField = page.getByPlaceholder("Absent, late, etc...");
    await noteField.fill(comment);
    await page.getByRole("button", { name: "Save Note" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await firstMarkInput.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Observation" }).click();
    await expect(noteField).toHaveValue(comment);
    await page.keyboard.press("Escape");

    await exportPdfFromReports(page, "Class Marksheet (PDF)");

    await assertNoStuckLoading(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("navigate between classes rapidly", async ({ page }) => {
    const runtimeErrors: string[] = [];
    await attachRuntimeGuards(page, runtimeErrors);
    await login(page);

    await page.goto("/classes");
    await expect(page.getByRole("heading", { name: "Classes", exact: true })).toBeVisible();
    const firstClass = page.locator("text=/\\d+ learners/").first();
    await expect(firstClass).toBeVisible({ timeout: 20_000 });
    const classCount = await page.locator("text=/\\d+ learners/").count();
    expect(classCount).toBeGreaterThan(0);

    const hops = Math.min(Math.max(classCount, 1), 4);
    for (let i = 0; i < hops; i += 1) {
      await page.goto("/classes");
      const classCard = page.locator("text=/\\d+ learners/").nth(i % classCount);
      await expect(classCard).toBeVisible({ timeout: 20_000 });
      await classCard.click();
      await page.waitForURL(/\/classes\/.+/, { timeout: 20_000 });
      await expect(page.getByRole("tab", { name: "Assessments" })).toBeVisible();
      await assertNoStuckLoading(page);
    }

    await assertNoRuntimeErrors(runtimeErrors);
  });
});
