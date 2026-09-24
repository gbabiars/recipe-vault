import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Button } from "./button";
import styles from "./button.module.css";

afterEach(cleanup);

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

test("keeps button labels on one line", () => {
  render(<Button>Edit recipe</Button>);

  const button = screen.getByRole("button", { name: "Edit recipe" });

  expect(window.getComputedStyle(button).whiteSpace).toBe("nowrap");
});

test("allows an explicit button type", () => {
  render(<Button type="submit">Save changes</Button>);

  expect(screen.getByRole("button", { name: "Save changes" }).getAttribute("type")).toBe("submit");
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
