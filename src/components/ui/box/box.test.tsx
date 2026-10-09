import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import "../../../app/globals.css";

import { Box, type BoxPadding } from "./box";

const paddings = [
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
] as const;

const paddingProps = [
  ["padding", "paddingInlineStart", "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd"],
  ["paddingInline", "paddingInlineStart", "paddingInlineEnd"],
  ["paddingBlock", "paddingBlockStart", "paddingBlockEnd"],
  ["paddingInlineStart", "paddingInlineStart"],
  ["paddingInlineEnd", "paddingInlineEnd"],
  ["paddingBlockStart", "paddingBlockStart"],
  ["paddingBlockEnd", "paddingBlockEnd"],
] as const;

const pixels = (rem: number) =>
  `${rem * parseFloat(getComputedStyle(document.documentElement).fontSize)}px`;

test.each(paddingProps)("maps %s to the matching spacing token", (prop, ...sides) => {
  for (const [padding, rem] of paddings) {
    const props = { [prop]: padding } as Record<string, BoxPadding>;
    const { unmount } = render(<Box {...props} data-testid="box" />);
    const box = screen.getByTestId("box");
    const computed = getComputedStyle(box);

    expect(
      box.getAttribute(`data-${prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`),
    ).toBe(padding);
    for (const side of sides) {
      const cssSide = side as
        | "paddingInlineStart"
        | "paddingInlineEnd"
        | "paddingBlockStart"
        | "paddingBlockEnd";
      expect(computed[cssSide]).toBe(pixels(rem));
    }

    unmount();
  }
});

test("side padding overrides axis and all-side padding", () => {
  render(
    <Box
      padding="400"
      paddingInline="200"
      paddingBlock="200"
      paddingInlineStart="100"
      paddingBlockEnd="050"
      data-testid="box"
    />,
  );

  const computed = getComputedStyle(screen.getByTestId("box"));

  expect(computed.paddingInlineStart).toBe(pixels(0.5));
  expect(computed.paddingInlineEnd).toBe(pixels(1));
  expect(computed.paddingBlockStart).toBe(pixels(1));
  expect(computed.paddingBlockEnd).toBe(pixels(0.25));
});

test("renders a semantic element, forwards native props, and forwards its ref", () => {
  const ref = createRef<HTMLElement>();

  render(
    <Box
      as="section"
      padding="300"
      aria-label="Ingredients"
      id="ingredients"
      ref={ref}
      data-testid="box"
    >
      Ingredients
    </Box>,
  );

  const box = screen.getByTestId("box");

  expect(box).toBeInstanceOf(HTMLElement);
  expect(box.tagName).toBe("SECTION");
  expect(box).toHaveAttribute("aria-label", "Ingredients");
  expect(box).toHaveAttribute("id", "ingredients");
  expect(ref.current).toBe(box);
  expect(box).toHaveTextContent("Ingredients");
});
