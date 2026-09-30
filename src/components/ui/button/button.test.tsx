import type { SVGProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { Button } from "./button";
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

function TestIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="button-icon" />;
}

test("renders a medium default button and handles clicks", () => {
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Create recipe</Button>);

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(button.getAttribute("type")).toBe("button");
  expect(button.getAttribute("data-variant")).toBe("default");
  expect(button.getAttribute("data-size")).toBe("medium");
  expect(button.classList.contains(styles.button)).toBe(true);

  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("renders href mode as an anchor with link semantics", () => {
  render(
    <Button href="/recipes/new" variant="primary" title="Create a recipe">
      Create recipe
    </Button>,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.getAttribute("title")).toBe("Create a recipe");
  expect(link.getAttribute("data-variant")).toBe("primary");
  expect(link.getAttribute("data-size")).toBe("medium");
  expect(link.hasAttribute("type")).toBe(false);
  expect(link.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("button", { name: "Create recipe" })).toBeNull();
});

test("forwards anchor props, styles, handlers, and refs through Next.js Link", () => {
  const handleClick = vi.fn();
  const ref = { current: null as HTMLAnchorElement | null };

  render(
    <Button
      ref={ref}
      href="/recipes/new"
      className="recipe-link"
      onClick={(event) => {
        handleClick();
        event.preventDefault();
      }}
      render={(anchorProps) => <Link {...anchorProps} prefetch={false} />}
    >
      Create recipe
    </Button>,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.classList.contains(styles.button)).toBe(true);
  expect(link.classList.contains("recipe-link")).toBe(true);
  expect(ref.current).toBe(link);

  fireEvent.click(link);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("composes a Next.js Link element for server component callers", () => {
  render(
    <Button href="/recipes/new" render={<Link href="/recipes/new" prefetch={false} />}>
      Create recipe
    </Button>,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.classList.contains(styles.button)).toBe(true);
});

test("renders a decorative leading icon without changing the accessible label", () => {
  render(<Button icon={TestIcon}>Save changes</Button>);

  const button = screen.getByRole("button", { name: "Save changes" });
  const icon = screen.getByTestId("button-icon");

  expect(button.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(icon.classList.contains(styles.icon)).toBe(true);
});

test("renders a decorative leading icon in href mode", () => {
  render(
    <Button href="/recipes" icon={TestIcon}>
      Recipes
    </Button>,
  );

  const link = screen.getByRole("link", { name: "Recipes" });
  const icon = screen.getByTestId("button-icon");

  expect(link.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(icon.classList.contains(styles.icon)).toBe(true);
});

test("keeps button labels on one line", () => {
  render(<Button>Edit recipe</Button>);

  const button = screen.getByRole("button", { name: "Edit recipe" });

  expect(window.getComputedStyle(button).whiteSpace).toBe("nowrap");
});

test("fits its content by default and can fill its parent", () => {
  render(
    <div style={{ display: "grid", width: "320px" }}>
      <Button>Fit content</Button>
      <Button fullWidth>Fill parent</Button>
    </div>,
  );

  const fitted = screen.getByRole("button", { name: "Fit content" });
  const full = screen.getByRole("button", { name: "Fill parent" });

  expect(fitted.getBoundingClientRect().width).toBeLessThan(320);
  expect(fitted.hasAttribute("data-full-width")).toBe(false);
  expect(full.getBoundingClientRect().width).toBe(320);
  expect(full.hasAttribute("data-full-width")).toBe(true);
  expect(full.hasAttribute("fullWidth")).toBe(false);
});

test("allows an explicit button type", () => {
  render(<Button type="submit">Save changes</Button>);

  expect(screen.getByRole("button", { name: "Save changes" }).getAttribute("type")).toBe("submit");
});

test("renders href mode at full width when requested", () => {
  render(
    <div style={{ display: "grid", width: "320px" }}>
      <Button href="/recipes">Fit content</Button>
      <Button href="/recipes" fullWidth>
        Fill parent
      </Button>
    </div>,
  );

  const fitted = screen.getByRole("link", { name: "Fit content" });
  const full = screen.getByRole("link", { name: "Fill parent" });

  expect(fitted.getBoundingClientRect().width).toBeLessThan(320);
  expect(fitted.hasAttribute("data-full-width")).toBe(false);
  expect(full.getBoundingClientRect().width).toBe(320);
  expect(full.hasAttribute("data-full-width")).toBe(true);
});

test.each(["default", "primary", "subtle", "danger"] as const)(
  "renders the %s variant",
  (variant) => {
    render(<Button variant={variant}>Action</Button>);

    const button = screen.getByRole("button", { name: "Action" });

    expect(button.getAttribute("data-variant")).toBe(variant);
    expect(button.className).toBe(styles.button);
  },
);

test.each(["small", "medium", "large"] as const)("renders the %s size", (size) => {
  render(<Button size={size}>Action</Button>);

  const button = screen.getByRole("button", { name: "Action" });

  expect(button.getAttribute("data-size")).toBe(size);
  expect(button.hasAttribute("size")).toBe(false);
});

test("merges a consumer class name with the button class", () => {
  render(<Button className="recipe-button">Create recipe</Button>);

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect(button.classList.contains(styles.button)).toBe(true);
  expect(button.classList.contains("recipe-button")).toBe(true);
});

test("does not handle clicks while disabled", () => {
  const handleClick = vi.fn();

  render(
    <Button disabled onClick={handleClick}>
      Create recipe
    </Button>,
  );

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect((button as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(button);

  expect(handleClick).not.toHaveBeenCalled();
});
