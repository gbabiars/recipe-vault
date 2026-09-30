import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const configured = Boolean(email && password);

test.describe("recipe creation", () => {
  test.skip(!configured, "Set E2E_EMAIL and E2E_PASSWORD for the private Clerk test account.");

  test("validates and creates a recipe", async ({ page }) => {
    const title = `Playwright soup ${Date.now()}`;

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/recipes$/);

    await page.getByRole("link", { name: "Create recipe" }).first().click();
    await expect(page.getByRole("heading", { name: "Create recipe" })).toBeVisible();

    await page.getByRole("button", { name: "Create recipe" }).click();
    await expect(page.getByRole("alert")).toContainText("Please correct the highlighted fields.");
    await expect(page.getByLabel("Title")).toBeFocused();

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Amount (optional)").fill("2 cups");
    await page.getByLabel("Ingredient name").fill("vegetable stock");
    await page.getByLabel("Instruction").fill("Warm the stock and serve.");
    await page.getByRole("button", { name: "Create recipe" }).click();

    await expect(page).toHaveURL(/\/recipes$/);
    const createdRecipe = page.getByRole("link", { name: title });
    await expect(createdRecipe).toBeVisible();
    await createdRecipe.click();
    await expect(page.getByText("2 cups vegetable stock")).toBeVisible();
  });
});
