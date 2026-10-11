import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeDocumentListSummary, RecipeSummary } from "@/lib/db/recipe-repository";
import { List } from "@/components/ui/list";
import { RecipeListItem } from "./recipe-list-item";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "test-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  totalTimeMinutes: 0,
  servings: 4,
  tags: ["weeknight", "soup", "vegetarian", "high-protein", "quick"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

test("shows a linked title, time, servings, and up to two tags plus the remainder", () => {
  render(
    <List>
      <RecipeListItem recipe={recipe} />
    </List>,
  );

  const item = screen.getByRole("listitem");
  const link = within(item).getByRole("link", { name: "Tomato soup" });

  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  expect(within(item).getByText("Total time: 0 min")).toBeTruthy();
  expect(within(item).getByText("Serves 4")).toBeTruthy();
  expect(within(item).getByText("weeknight")).toBeTruthy();
  expect(within(item).getByText("soup")).toBeTruthy();
  expect(within(item).getByText("+3")).toBeTruthy();
  expect(within(item).queryByText("vegetarian")).toBeNull();
  expect(within(item).queryByText("A simple soup with fresh basil.")).toBeNull();
  expect(within(item).queryByText("Updated Sep 15, 2026")).toBeNull();
  expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
});

test("omits the metadata line and tag line when values are absent", () => {
  render(
    <List>
      <RecipeListItem
        recipe={{
          ...recipe,
          id: "plain-rice",
          title: "Plain rice",
          summary: undefined,
          totalTimeMinutes: undefined,
          servings: undefined,
          tags: [],
        }}
      />
    </List>,
  );

  const item = screen.getByRole("listitem");

  expect(within(item).getByRole("link", { name: "Plain rice" }).getAttribute("href")).toBe(
    "/recipes/plain-rice",
  );
  expect(within(item).queryByText(/Total time:/)).toBeNull();
  expect(within(item).queryByText(/Serves/)).toBeNull();
  expect(within(item).queryByText("weeknight")).toBeNull();
  expect(within(item).queryByText("vegetarian")).toBeNull();
  expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(0);
});

const documentSummary: RecipeDocumentListSummary = {
  id: "orange-shortbread",
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { prepMinutes: 15, cookMinutes: 18, totalMinutes: 45 },
  tags: ["baking", "cookies", "dessert"],
  revision: 2,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

test("document summary shows optional yield, independent times, and tags without description", () => {
  render(
    <List>
      <RecipeListItem documentSummary={documentSummary} />
    </List>,
  );

  const item = screen.getByRole("listitem");
  expect(within(item).getByRole("link", { name: "Orange shortbread" }).getAttribute("href")).toBe(
    "/recipes/orange-shortbread",
  );
  expect(within(item).queryByText("Crisp cookies with orange zest.")).toBeNull();
  expect(within(item).getByText("Yield: 24 cookies")).toBeTruthy();
  expect(within(item).getByText("Prep: 15 min")).toBeTruthy();
  expect(within(item).getByText("Cook: 18 min")).toBeTruthy();
  expect(within(item).getByText("Total time: 45 min")).toBeTruthy();
  expect(within(item).getByText("baking")).toBeTruthy();
  expect(within(item).getByText("cookies")).toBeTruthy();
  expect(within(item).getByText("+1")).toBeTruthy();
  expect(within(item).queryByText("dessert")).toBeNull();
  expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
});

test("document summary omits unknown yield, times, description, and empty tags", () => {
  render(
    <List>
      <RecipeListItem
        documentSummary={{
          ...documentSummary,
          id: "quick-pickled-onions",
          title: "Quick pickled onions",
          description: "",
          yield: undefined,
          time: {},
          tags: [],
        }}
      />
    </List>,
  );

  const item = screen.getByRole("listitem");
  expect(within(item).getByRole("link", { name: "Quick pickled onions" })).toBeTruthy();
  expect(within(item).queryByText(/Yield:/)).toBeNull();
  expect(within(item).queryByText(/Prep:/)).toBeNull();
  expect(within(item).queryByText(/Cook:/)).toBeNull();
  expect(within(item).queryByText(/Total time:/)).toBeNull();
  expect(within(item).queryByText("Crisp cookies with orange zest.")).toBeNull();
  expect(within(item).queryByText("baking")).toBeNull();
  expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(0);
});
