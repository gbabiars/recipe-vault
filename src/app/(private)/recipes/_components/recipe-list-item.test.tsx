import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { List } from "@/components/ui/list";
import { RecipeListItem } from "./recipe-list-item";

const documentSummary: RecipeSummary = {
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
