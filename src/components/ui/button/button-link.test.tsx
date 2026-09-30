import type { MouseEvent } from "react";
import type { SVGProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { ButtonLink } from "./button-link";
import styles from "./button.module.css";

afterEach(cleanup);

function TestIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="button-link-icon" />;
}

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
  expect(link.getAttribute("data-size")).toBe("medium");
  expect(link.classList.contains(styles.button)).toBe(true);

  fireEvent.click(link);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("renders a decorative leading icon without changing the accessible label", () => {
  render(
    <ButtonLink href="/recipes" icon={TestIcon}>
      Recipes
    </ButtonLink>,
  );

  const link = screen.getByRole("link", { name: "Recipes" });
  const icon = screen.getByTestId("button-link-icon");

  expect(link.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(icon.classList.contains(styles.icon)).toBe(true);
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

test("fits its content by default and can fill its parent", () => {
  render(
    <div style={{ display: "grid", width: "320px" }}>
      <ButtonLink href="/recipes/new">Fit content</ButtonLink>
      <ButtonLink href="/recipes/new" fullWidth>
        Fill parent
      </ButtonLink>
    </div>,
  );

  const fitted = screen.getByRole("link", { name: "Fit content" });
  const full = screen.getByRole("link", { name: "Fill parent" });

  expect(fitted.getBoundingClientRect().width).toBeLessThan(320);
  expect(fitted.hasAttribute("data-full-width")).toBe(false);
  expect(full.getBoundingClientRect().width).toBe(320);
  expect(full.hasAttribute("data-full-width")).toBe(true);
  expect(full.hasAttribute("fullWidth")).toBe(false);
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

test.each(["default", "primary", "subtle", "danger"] as const)(
  "renders the %s variant with shared button styles",
  (variant) => {
    render(
      <ButtonLink variant={variant} href="/recipes">
        Action
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Action" });

    expect(link.getAttribute("data-variant")).toBe(variant);
    expect(link.className).toBe(styles.button);
  },
);

test.each(["small", "medium", "large"] as const)("renders the %s size", (size) => {
  render(
    <ButtonLink size={size} href="/recipes">
      Action
    </ButtonLink>,
  );

  const link = screen.getByRole("link", { name: "Action" });

  expect(link.getAttribute("data-size")).toBe(size);
  expect(link.hasAttribute("size")).toBe(false);
});
