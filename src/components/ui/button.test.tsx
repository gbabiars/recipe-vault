import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Button } from "./button";
import styles from "./button.module.css";

afterEach(cleanup);

test("renders as a primary button and handles clicks", () => {
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Create recipe</Button>);

  const button = screen.getByRole("button", { name: "Create recipe" });

  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(button.getAttribute("type")).toBe("button");
  expect(button.getAttribute("data-variant")).toBe("default");
  expect(button.classList.contains(styles.button)).toBe(true);

  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("allows an explicit button type", () => {
  render(<Button type="submit">Save changes</Button>);

  expect(screen.getByRole("button", { name: "Save changes" }).getAttribute("type")).toBe("submit");
});

test("renders the danger variant through a data attribute", () => {
  render(<Button variant="danger">Delete recipe</Button>);

  const button = screen.getByRole("button", { name: "Delete recipe" });

  expect(button.getAttribute("data-variant")).toBe("danger");
  expect(button.className).toBe(styles.button);
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
