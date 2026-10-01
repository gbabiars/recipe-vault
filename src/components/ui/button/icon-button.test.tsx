import type { SVGProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { IconButton } from "./icon-button";
import styles from "./button.module.css";

function TestIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="icon-button-icon" />;
}

test("renders a named medium default button with a decorative icon", () => {
  render(<IconButton icon={TestIcon} label="Delete recipe" />);

  const button = screen.getByRole("button", { name: "Delete recipe" });
  const icon = screen.getByTestId("icon-button-icon");

  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(button.getAttribute("type")).toBe("button");
  expect(button.getAttribute("data-variant")).toBe("default");
  expect(button.getAttribute("data-size")).toBe("medium");
  expect(button.hasAttribute("data-full-width")).toBe(false);
  expect(button.classList.contains(styles.iconOnly)).toBe(true);
  expect(button.textContent).toBe("");
  expect(button.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
});

test("renders href mode as a named link with a decorative icon", () => {
  const ref = { current: null as HTMLAnchorElement | null };

  render(<IconButton ref={ref} icon={TestIcon} label="Open recipe" href="/recipes/tomato-soup" />);

  const link = screen.getByRole("link", { name: "Open recipe" });
  const icon = screen.getByTestId("icon-button-icon");

  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  expect(link.hasAttribute("type")).toBe(false);
  expect(link.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("button", { name: "Open recipe" })).toBeNull();
  expect(link.classList.contains(styles.iconOnly)).toBe(true);
  expect(ref.current).toBe(link);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
});

test("handles clicks", () => {
  const handleClick = vi.fn();

  render(<IconButton icon={TestIcon} label="Delete recipe" onClick={handleClick} />);

  fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("forwards a ref to the native button", () => {
  const ref = { current: null as HTMLElement | null };

  render(<IconButton ref={ref} icon={TestIcon} label="Delete recipe" />);

  expect(ref.current).toBe(screen.getByRole("button", { name: "Delete recipe" }));
});

test("preserves native button props", () => {
  render(<IconButton icon={TestIcon} label="Save recipe" type="submit" />);

  expect(screen.getByRole("button", { name: "Save recipe" }).getAttribute("type")).toBe("submit");
});

test.each(["default", "primary", "subtle", "danger"] as const)(
  "renders the %s variant",
  (variant) => {
    render(<IconButton icon={TestIcon} label="Action" variant={variant} />);

    const button = screen.getByRole("button", { name: "Action" });

    expect(button.getAttribute("data-variant")).toBe(variant);
    expect(button.classList.contains(styles.iconOnly)).toBe(true);
  },
);

test.each(["small", "medium", "large"] as const)("renders the %s size", (size) => {
  render(<IconButton icon={TestIcon} label="Action" size={size} />);

  const button = screen.getByRole("button", { name: "Action" });

  expect(button.getAttribute("data-size")).toBe(size);
  expect(button.hasAttribute("size")).toBe(false);
});

test("does not handle clicks while disabled", () => {
  const handleClick = vi.fn();

  render(<IconButton disabled icon={TestIcon} label="Delete recipe" onClick={handleClick} />);

  const button = screen.getByRole("button", { name: "Delete recipe" });

  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button);

  expect(handleClick).not.toHaveBeenCalled();
});

test("merges a consumer class name with the icon-only button style", () => {
  render(<IconButton className="recipe-icon-button" icon={TestIcon} label="Edit recipe" />);

  const button = screen.getByRole("button", { name: "Edit recipe" });

  expect(button.classList.contains(styles.iconOnly)).toBe(true);
  expect(button.classList.contains("recipe-icon-button")).toBe(true);
});
