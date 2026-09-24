import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../app/globals.css";

import { Stack, type StackGap } from "./stack";
import styles from "./stack.module.css";

afterEach(cleanup);

test("renders one vertical div with default gap and alignment", () => {
  render(
    <Stack data-testid="stack">
      <span>First</span>
      <span>Second</span>
    </Stack>,
  );

  const stack = screen.getByTestId("stack");
  const computed = getComputedStyle(stack);

  expect(stack).toBeInstanceOf(HTMLDivElement);
  expect(stack.children).toHaveLength(2);
  expect(stack.classList.contains(styles.stack)).toBe(true);
  expect(stack.getAttribute("data-gap")).toBe("0");
  expect(stack.getAttribute("data-align")).toBe("stretch");
  expect(stack.getAttribute("data-justify")).toBe("start");
  expect(computed.display).toBe("flex");
  expect(computed.flexDirection).toBe("column");
  expect(computed.gap).toBe("0px");
  expect(computed.alignItems).toBe("stretch");
  expect(computed.justifyContent).toBe("flex-start");
});

test.each([
  ["0", 0],
  ["025", 0.125],
  ["050", 0.25],
  ["075", 0.375],
  ["100", 0.5],
  ["150", 0.75],
  ["200", 1],
  ["250", 1.25],
  ["300", 1.5],
  ["400", 2],
  ["500", 2.5],
  ["600", 3],
  ["800", 4],
  ["1000", 5],
  ["1200", 6],
] as const)("maps gap %s to its spacing token", (gap: StackGap, rem) => {
  render(
    <Stack gap={gap} data-testid="stack">
      Item
    </Stack>,
  );

  const stack = screen.getByTestId("stack");
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

  expect(stack.getAttribute("data-gap")).toBe(gap);
  expect(getComputedStyle(stack).gap).toBe(`${rem * rootFontSize}px`);
});

test.each([
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["stretch", "stretch"],
] as const)("aligns items at %s on the horizontal axis", (align, cssValue) => {
  render(<Stack align={align} data-testid="stack" />);

  const stack = screen.getByTestId("stack");

  expect(stack.getAttribute("data-align")).toBe(align);
  expect(getComputedStyle(stack).alignItems).toBe(cssValue);
});

test.each([
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["between", "space-between"],
  ["around", "space-around"],
  ["evenly", "space-evenly"],
] as const)("justifies items at %s on the vertical axis", (justify, cssValue) => {
  render(<Stack justify={justify} data-testid="stack" />);

  const stack = screen.getByTestId("stack");

  expect(stack.getAttribute("data-justify")).toBe(justify);
  expect(getComputedStyle(stack).justifyContent).toBe(cssValue);
});

test.each(["section", "ul"] as const)("renders as a semantic %s", (as) => {
  render(
    <Stack as={as} data-testid="stack">
      Content
    </Stack>,
  );

  expect(screen.getByTestId("stack").tagName).toBe(as.toUpperCase());
});

test("forwards native props and a ref to the chosen element", () => {
  const ref = { current: null as HTMLUListElement | null };

  render(
    <Stack as="ul" ref={ref} aria-label="Ingredients" data-testid="stack" id="ingredients">
      <li>Tomatoes</li>
    </Stack>,
  );

  const stack = screen.getByTestId("stack");

  expect(ref.current).toBe(stack);
  expect(stack.getAttribute("aria-label")).toBe("Ingredients");
  expect(stack.id).toBe("ingredients");
});

test("merges a consumer class name", () => {
  render(
    <Stack className="recipe-steps" data-testid="stack">
      Steps
    </Stack>,
  );

  const stack = screen.getByTestId("stack");

  expect(stack.classList.contains(styles.stack)).toBe(true);
  expect(stack.classList.contains("recipe-steps")).toBe(true);
});
