import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("private sidebar navigation and sign out", async ({ page }) => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD for the private Clerk test account.",
  );

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);

  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/recipes$/);

  const navigation = page.getByRole("navigation", { name: "Primary" });
  const recipes = navigation.getByRole("link", { name: "Recipes" });
  const settings = navigation.getByRole("link", { name: "Settings" });
  await expect(recipes).toHaveAttribute("aria-current", "page");
  await recipes.focus();
  await expect(recipes).toBeFocused();

  await settings.click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(settings).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/user-profile$/);
  await expect(settings).toHaveClass(/active/);

  await settings.click();
  await page.getByRole("link", { name: "MCP keys" }).click();
  await expect(page).toHaveURL(/\/mcp-keys$/);
  await expect(settings).toHaveClass(/active/);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(navigation).toHaveCount(0);
});
