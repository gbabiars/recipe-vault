import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { DocumentTagInventoryItem } from "@/lib/db/tag-repository";
import { DocumentTagCatalog } from "./tag-catalog";

const tags: DocumentTagInventoryItem[] = [
  { name: "quick meals", usageCount: 1 },
  { name: "rice & beans", usageCount: 12 },
];

test("shows document tag names and usage with links to exact recipe filters", () => {
  render(<DocumentTagCatalog tags={tags} />);

  const list = screen.getByRole("list", { name: "Tags" });
  const entries = within(list).getAllByRole("listitem");

  expect(entries).toHaveLength(2);
  expect(within(entries[0]).getByRole("link", { name: "quick meals" }).getAttribute("href")).toBe(
    "/recipes?tag=quick%20meals",
  );
  expect(within(entries[0]).getByText("1 recipe")).toBeTruthy();
  expect(within(entries[1]).getByRole("link", { name: "rice & beans" }).getAttribute("href")).toBe(
    "/recipes?tag=rice%20%26%20beans",
  );
  expect(within(entries[1]).getByText("12 recipes")).toBeTruthy();
});

test("shows the existing empty state", () => {
  render(<DocumentTagCatalog tags={[]} />);

  expect(screen.getByRole("heading", { name: "No tags yet" })).toBeTruthy();
  expect(screen.getByText("Tag names will appear here when you add them to recipes.")).toBeTruthy();
});

test("shows the existing error state", () => {
  render(<DocumentTagCatalog tags={[]} error />);

  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByText("Tags could not be loaded. Refresh the page to try again.")).toBeTruthy();
});

test("shows accessible previous and next pagination links", () => {
  render(
    <DocumentTagCatalog
      tags={tags}
      previousHref="/tags?cursor=previous"
      nextHref="/tags?cursor=next"
    />,
  );

  const navigation = screen.getByRole("navigation", { name: "Tag pages" });
  expect(within(navigation).getByRole("link", { name: "Previous" }).getAttribute("href")).toBe(
    "/tags?cursor=previous",
  );
  expect(within(navigation).getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
    "/tags?cursor=next",
  );
});
