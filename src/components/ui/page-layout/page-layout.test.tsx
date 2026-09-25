import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../../app/globals.css";

import { PageContent, PageHeader, PageLayout } from "./page-layout";

afterEach(cleanup);

test("places the header and content 1.5rem apart", () => {
  render(
    <PageLayout data-testid="layout">
      <PageHeader title="Recipes" />
      <PageContent>Recipe list</PageContent>
    </PageLayout>,
  );

  const layout = screen.getByTestId("layout");
  expect(layout.children).toHaveLength(2);
  expect(layout.children[0].tagName).toBe("HEADER");
  expect(getComputedStyle(layout).gap).toBe("24px");
});

test("renders the optional overline, description, and actions", () => {
  render(
    <PageLayout>
      <PageHeader
        title="Tomato soup"
        overline={<a href="https://example.com/recipes">All recipes</a>}
        description="Fresh basil soup"
        actions={
          <>
            <a href="https://example.com/recipes/1/edit">Edit recipe</a>
            <button type="button">Share</button>
          </>
        }
      />
      <PageContent>Details</PageContent>
    </PageLayout>,
  );

  const heading = screen.getByRole("heading", { level: 1, name: "Tomato soup" });
  expect(heading.getAttribute("data-level")).toBe("2");
  expect(screen.getByRole("link", { name: "All recipes" }).getAttribute("href")).toBe(
    "https://example.com/recipes",
  );
  expect(screen.getByText("Fresh basil soup").getAttribute("data-size")).toBe("medium");
  expect(screen.getByRole("link", { name: "Edit recipe" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();

  const header = heading.closest("header");
  const headingRow = heading.parentElement?.parentElement;
  expect(
    header?.firstElementChild?.contains(screen.getByRole("link", { name: "All recipes" })),
  ).toBe(true);
  expect(header?.lastElementChild).toBe(headingRow);
  expect(
    headingRow?.lastElementChild?.contains(screen.getByRole("button", { name: "Share" })),
  ).toBe(true);
  expect(getComputedStyle(headingRow!).alignItems).toBe("flex-start");
});

test("omits empty optional slots", () => {
  const { container } = render(<PageHeader title="Settings" />);

  expect(container.querySelector("header")?.children).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
});
