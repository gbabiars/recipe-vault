import type { MouseEvent } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { ButtonLink } from "./button-link";
import styles from "./button.module.css";

afterEach(cleanup);

let Link: typeof import("next/link").default;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  Link = (await import("next/link")).default;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

test("renders a styled native anchor and handles clicks", () => {
  const handleClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  });

  render(
    <ButtonLink href="/recipes/new" onClick={handleClick}>
      Create recipe
    </ButtonLink>,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.getAttribute("data-variant")).toBe("default");
  expect(link.classList.contains(styles.button)).toBe(true);

  fireEvent.click(link);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("forwards a ref to the rendered anchor", () => {
  const ref = { current: null as HTMLAnchorElement | null };

  render(
    <ButtonLink ref={ref} href="/recipes">
      Recipes
    </ButtonLink>,
  );

  expect(ref.current).toBe(screen.getByRole("link", { name: "Recipes" }));
});

test("composes with Next.js Link through render", () => {
  render(<ButtonLink render={<Link href="/recipes/new" />}>Create recipe</ButtonLink>);

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.classList.contains(styles.button)).toBe(true);
});

test("merges consumer class names with the shared button class", () => {
  render(
    <ButtonLink className="recipe-link" href="/recipes">
      Recipes
    </ButtonLink>,
  );

  const link = screen.getByRole("link", { name: "Recipes" });

  expect(link.classList.contains(styles.button)).toBe(true);
  expect(link.classList.contains("recipe-link")).toBe(true);
});

test("renders the danger variant through a data attribute", () => {
  render(
    <ButtonLink variant="danger" href="/recipes/delete">
      Delete recipe
    </ButtonLink>,
  );

  const link = screen.getByRole("link", { name: "Delete recipe" });

  expect(link.getAttribute("data-variant")).toBe("danger");
  expect(link.className).toBe(styles.button);
});
