import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { expect, test, vi } from "vitest";

import { Button } from "./button";
import { LinkRendererProvider, type LinkRendererProps } from "../link-renderer";
import styles from "./button.module.css";

function TestIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="button-icon" />;
}

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkRendererProps>(
  function RouterLink(props, ref) {
    return <a {...props} ref={ref} data-router="test" />;
  },
);

test("renders a medium default button and handles clicks", () => {
  const handleClick = vi.fn();

  render(<Button label="Create recipe" onClick={handleClick} />);

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
    <Button label="Create recipe" href="/recipes/new" variant="primary" title="Create a recipe" />,
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

test("uses the configured link renderer and forwards anchor props and ref", () => {
  const ref = { current: null as HTMLAnchorElement | null };

  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <Button ref={ref} label="Create recipe" href="/recipes/new" target="_blank" />
    </LinkRendererProvider>,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });
  expect(link.getAttribute("data-router")).toBe("test");
  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(ref.current).toBe(link);
});

test("an explicit render overrides the configured link renderer", () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <Button label="Download" href="/export" render={<a href="/export" download />} />
    </LinkRendererProvider>,
  );

  const link = screen.getByRole("link", { name: "Download" });
  expect(link.getAttribute("data-router")).toBeNull();
  expect(link.hasAttribute("download")).toBe(true);
});

test("forwards anchor props, styles, handlers, and refs through Next.js Link", () => {
  const handleClick = vi.fn();
  const ref = { current: null as HTMLAnchorElement | null };

  render(
    <Button
      ref={ref}
      label="Create recipe"
      href="/recipes/new"
      className="recipe-link"
      onClick={(event) => {
        handleClick();
        event.preventDefault();
      }}
      render={(anchorProps) => <Link {...anchorProps} prefetch={false} />}
    />,
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
    <Button
      label="Create recipe"
      href="/recipes/new"
      render={<Link href="/recipes/new" prefetch={false} />}
    />,
  );

  const link = screen.getByRole("link", { name: "Create recipe" });

  expect(link.getAttribute("href")).toBe("/recipes/new");
  expect(link.classList.contains(styles.button)).toBe(true);
});

test("renders a decorative leading icon without changing the accessible label", () => {
  render(<Button label="Save changes" icon={TestIcon} />);

  const button = screen.getByRole("button", { name: "Save changes" });
  const icon = screen.getByTestId("button-icon");

  expect(button.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(icon.classList.contains(styles.icon)).toBe(true);
});

test("renders a decorative leading icon in href mode", () => {
  render(<Button label="Recipes" href="/recipes" icon={TestIcon} />);

  const link = screen.getByRole("link", { name: "Recipes" });
  const icon = screen.getByTestId("button-icon");

  expect(link.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(icon.classList.contains(styles.icon)).toBe(true);
});

test("keeps button labels on one line", () => {
  render(<Button label="Edit recipe" />);

  const button = screen.getByRole("button", { name: "Edit recipe" });

  expect(window.getComputedStyle(button).whiteSpace).toBe("nowrap");
});

test("fits its content by default and can fill its parent", () => {
  render(
    <div style={{ display: "grid", width: "320px" }}>
      <Button label="Fit content" />
      <Button label="Fill parent" fullWidth />
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
  render(<Button label="Save changes" type="submit" />);

  expect(screen.getByRole("button", { name: "Save changes" }).getAttribute("type")).toBe("submit");
});

test("renders href mode at full width when requested", () => {
  render(
    <div style={{ display: "grid", width: "320px" }}>
      <Button label="Fit content" href="/recipes" />
      <Button label="Fill parent" href="/recipes" fullWidth />
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
    render(<Button label="Action" variant={variant} />);

    const button = screen.getByRole("button", { name: "Action" });

    expect(button.getAttribute("data-variant")).toBe(variant);
    expect(button.className).toBe(styles.button);
  },
);

test.each(["small", "medium", "large"] as const)("renders the %s size", (size) => {
  render(<Button label="Action" size={size} />);

  const button = screen.getByRole("button", { name: "Action" });

  expect(button.getAttribute("data-size")).toBe(size);
  expect(button.hasAttribute("size")).toBe(false);
});

test("merges a consumer class name with the button class", () => {
  render(<Button label="Create recipe" className="recipe-button" />);

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect(button.classList.contains(styles.button)).toBe(true);
  expect(button.classList.contains("recipe-button")).toBe(true);
});

test("does not handle clicks while disabled", () => {
  const handleClick = vi.fn();

  render(<Button label="Create recipe" disabled onClick={handleClick} />);

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect((button as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(button);

  expect(handleClick).not.toHaveBeenCalled();
});
