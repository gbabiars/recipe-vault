import { expect, test } from "@playwright/test";
import recipeViewHtml from "../src/mcp/generated/recipe-view";

declare global {
  interface Window {
    recipeViewMessages: unknown[];
    pwned?: boolean;
  }
}

test("renders a recipe result safely in a generic MCP Apps host", async ({ page }) => {
  await page.setContent('<iframe id="recipe-view" title="Recipe view"></iframe>');
  await page.evaluate(() => {
    const messages: unknown[] = [];
    window.recipeViewMessages = messages;
    window.addEventListener("message", (event) => {
      messages.push(event.data);
      if (event.data?.method !== "ui/initialize") return;
      const source = event.source as Window | null;
      source?.postMessage(
        {
          jsonrpc: "2.0",
          id: event.data.id,
          result: {
            protocolVersion: "2026-01-26",
            hostInfo: { name: "test-host", version: "1.0.0" },
            hostCapabilities: {},
            hostContext: {
              theme: "dark",
              styles: { variables: { "--color-text-primary": "rgb(1, 2, 3)" } },
            },
          },
        },
        "*",
      );
    });
  });

  const frameElement = await page.locator("#recipe-view").elementHandle();
  const frame = await frameElement?.contentFrame();
  if (!frame) throw new Error("Recipe view iframe was not available.");
  await frame.setContent(recipeViewHtml);

  await expect.poll(() => page.evaluate(() => window.recipeViewMessages.length)).toBeGreaterThan(1);
  await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.evaluate(() => {
    document.querySelector("iframe")?.contentWindow?.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: {
          content: [],
          structuredContent: {
            recipe: {
              title: '<img src=x onerror="window.pwned=true"> Smash burger',
              summary: "Crisp edges.",
              prepTimeMinutes: 5,
              cookTimeMinutes: 8,
              totalTimeMinutes: 13,
              servings: 2,
              tags: ["weeknight"],
              dietaryFlags: ["high-protein"],
              ingredients: [
                {
                  quantity: 450,
                  unit: "g",
                  ingredientName: "beef <script>window.pwned=true</script>",
                  notes: "80/20",
                },
              ],
              steps: [{ instruction: "Heat the skillet.", durationMinutes: 2 }],
              notes: "Salt just before cooking.\nRest for two minutes.",
              sourceUrl: "https://example.test/smash-burger",
            },
          },
        },
      },
      "*",
    );
  });

  await expect(frame.getByRole("heading", { level: 1 })).toHaveText(
    '<img src=x onerror="window.pwned=true"> Smash burger',
  );
  await expect(frame.getByText("beef <script>window.pwned=true</script>")).toBeVisible();
  await expect(frame.locator("img")).toHaveCount(0);
  expect(await frame.evaluate(() => window.pwned)).toBeUndefined();
  await expect(frame.locator(".notes")).toHaveText(
    "Salt just before cooking.\nRest for two minutes.",
  );
  await expect(frame.locator("a")).toHaveCount(0);

  await page.evaluate(() => {
    document.querySelector("iframe")?.contentWindow?.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: {
          content: [],
          structuredContent: {
            recipe: {
              title: "Plain eggs",
              tags: [],
              dietaryFlags: [],
              ingredients: [{ quantity: 2, unit: "", ingredientName: "eggs" }],
              steps: [{ instruction: "Cook." }],
            },
          },
        },
      },
      "*",
    );
  });

  await expect(frame.getByRole("heading", { level: 1 })).toHaveText("Plain eggs");
  await expect(frame.getByRole("heading", { name: "Notes" })).toHaveCount(0);
  await expect(frame.locator(".source")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.recipeViewMessages.some(
          (message) =>
            typeof message === "object" &&
            message !== null &&
            (message as { method?: unknown }).method === "ui/notifications/size-changed" &&
            typeof (message as { params?: { height?: unknown } }).params?.height === "number" &&
            typeof (message as { params?: { width?: unknown } }).params?.width === "number",
        ),
      ),
    )
    .toBe(true);
});
