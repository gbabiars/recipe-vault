import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../../app/globals.css";

import { Breadcrumbs, BreadcrumbsItem } from "./breadcrumbs";

afterEach(cleanup);

test("renders a labeled navigation landmark with an ordered list and current page", () => {
  render(
    <Breadcrumbs>
      <BreadcrumbsItem>
        <a href="https://example.com/recipes">Recipes</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem current>Tomato soup</BreadcrumbsItem>
    </Breadcrumbs>,
  );

  const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
  const list = screen.getByRole("list");
  const items = screen.getAllByRole("listitem");
  expect(nav.contains(list)).toBe(true);
  expect(items).toHaveLength(2);
  expect(items.every((item) => item.parentElement === list)).toBe(true);
  expect(screen.getByRole("link", { name: "Recipes" }).getAttribute("href")).toBe(
    "https://example.com/recipes",
  );
  expect(screen.queryByRole("link", { name: "Tomato soup" })).toBeNull();
  expect(screen.getByText("Tomato soup").getAttribute("aria-current")).toBe("page");
});

test("generates quiet separators only between items", () => {
  render(
    <Breadcrumbs>
      <BreadcrumbsItem>
        <a href="https://example.com/recipes">Recipes</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem>
        <a href="https://example.com/recipes/soups">Soups</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem current>Tomato soup</BreadcrumbsItem>
    </Breadcrumbs>,
  );

  const items = screen.getAllByRole("listitem");
  expect(items[0].textContent).toBe("Recipes");
  expect(items[1].textContent).toBe("Soups");
  expect(items[2].textContent).toBe("Tomato soup");
  expect(getComputedStyle(items[0], "::before").content).toBe("none");
  expect(getComputedStyle(items[1], "::before").content).toContain("/");
  expect(getComputedStyle(items[2], "::before").content).toContain("/");
  expect(getComputedStyle(items[2], "::after").content).toBe("none");
});

test("adds a trailing slash after ancestor links when the heading names the current page", () => {
  render(
    <Breadcrumbs trailingSeparator>
      <BreadcrumbsItem>
        <a href="https://example.com/recipes">Recipes</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem>
        <a href="https://example.com/recipes/soups">Soups</a>
      </BreadcrumbsItem>
    </Breadcrumbs>,
  );

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.queryByText("Tomato soup")).toBeNull();
  expect(
    screen.getByRole("navigation", { name: "Breadcrumbs" }).querySelector("[aria-current]"),
  ).toBeNull();
  expect(getComputedStyle(items[0], "::before").content).toBe("none");
  expect(getComputedStyle(items[0], "::after").content).toBe("none");
  expect(getComputedStyle(items[1], "::before").content).toContain("/");
  expect(getComputedStyle(items[1], "::after").content).toContain("/");
});
