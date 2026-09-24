import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../app/globals.css";

import { Inline, type InlineGap, type InlinePadding } from "./inline";
import styles from "./inline.module.css";

afterEach(cleanup);

const gaps = [
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

const paddings = gaps;

const pixels = (rem: number) =>
  `${rem * parseFloat(getComputedStyle(document.documentElement).fontSize)}px`;

test("renders one wrapping horizontal div with default spacing and alignment", () => {
  render(
    <Inline data-testid="inline">
      <span>First</span>
      <span>Second</span>
    </Inline>,
  );

  const inline = screen.getByTestId("inline");
  const computed = getComputedStyle(inline);

  expect(inline).toBeInstanceOf(HTMLDivElement);
  expect(inline.children).toHaveLength(2);
  expect(inline.classList.contains(styles.inline)).toBe(true);
  expect(inline.getAttribute("data-gap")).toBe("0");
  expect(inline.getAttribute("data-row-gap")).toBeNull();
  expect(inline.getAttribute("data-padding-inline")).toBeNull();
  expect(inline.getAttribute("data-padding-block")).toBeNull();
  expect(inline.getAttribute("data-padding-inline-start")).toBeNull();
  expect(inline.getAttribute("data-padding-inline-end")).toBeNull();
  expect(inline.getAttribute("data-padding-block-start")).toBeNull();
  expect(inline.getAttribute("data-padding-block-end")).toBeNull();
  expect(inline.getAttribute("data-align")).toBe("start");
  expect(inline.getAttribute("data-justify")).toBe("start");
  expect(inline.getAttribute("data-wrap")).toBe("true");
  expect(computed.display).toBe("flex");
  expect(computed.flexDirection).toBe("row");
  expect(computed.flexWrap).toBe("wrap");
  expect(computed.gap).toBe("0px");
  expect(computed.paddingInlineStart).toBe("0px");
  expect(computed.paddingInlineEnd).toBe("0px");
  expect(computed.paddingBlockStart).toBe("0px");
  expect(computed.paddingBlockEnd).toBe("0px");
  expect(computed.alignItems).toBe("flex-start");
  expect(computed.justifyContent).toBe("flex-start");
});

test.each(gaps)("maps gap %s to both axes", (gap: InlineGap, rem) => {
  render(<Inline gap={gap} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  const computed = getComputedStyle(inline);

  expect(inline.getAttribute("data-gap")).toBe(gap);
  expect(computed.columnGap).toBe(pixels(rem));
  expect(computed.rowGap).toBe(pixels(rem));
});

test.each(gaps)("maps rowGap %s independently from the column gap", (rowGap: InlineGap, rem) => {
  render(<Inline gap="200" rowGap={rowGap} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  const computed = getComputedStyle(inline);

  expect(inline.getAttribute("data-row-gap")).toBe(rowGap);
  expect(computed.columnGap).toBe(pixels(1));
  expect(computed.rowGap).toBe(pixels(rem));
});

test.each(paddings)("maps paddingInline %s to both inline sides", (padding: InlinePadding, rem) => {
  render(<Inline paddingInline={padding} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  const computed = getComputedStyle(inline);

  expect(inline.getAttribute("data-padding-inline")).toBe(padding);
  expect(computed.paddingInlineStart).toBe(pixels(rem));
  expect(computed.paddingInlineEnd).toBe(pixels(rem));
});

test.each(paddings)("maps paddingBlock %s to both block sides", (padding: InlinePadding, rem) => {
  render(<Inline paddingBlock={padding} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  const computed = getComputedStyle(inline);

  expect(inline.getAttribute("data-padding-block")).toBe(padding);
  expect(computed.paddingBlockStart).toBe(pixels(rem));
  expect(computed.paddingBlockEnd).toBe(pixels(rem));
});

test.each(paddings)(
  "maps paddingInlineStart %s to the inline start side",
  (padding: InlinePadding, rem) => {
    render(<Inline paddingInlineStart={padding} data-testid="inline" />);

    const inline = screen.getByTestId("inline");

    expect(inline.getAttribute("data-padding-inline-start")).toBe(padding);
    expect(getComputedStyle(inline).paddingInlineStart).toBe(pixels(rem));
  },
);

test.each(paddings)(
  "maps paddingInlineEnd %s to the inline end side",
  (padding: InlinePadding, rem) => {
    render(<Inline paddingInlineEnd={padding} data-testid="inline" />);

    const inline = screen.getByTestId("inline");

    expect(inline.getAttribute("data-padding-inline-end")).toBe(padding);
    expect(getComputedStyle(inline).paddingInlineEnd).toBe(pixels(rem));
  },
);

test.each(paddings)(
  "maps paddingBlockStart %s to the block start side",
  (padding: InlinePadding, rem) => {
    render(<Inline paddingBlockStart={padding} data-testid="inline" />);

    const inline = screen.getByTestId("inline");

    expect(inline.getAttribute("data-padding-block-start")).toBe(padding);
    expect(getComputedStyle(inline).paddingBlockStart).toBe(pixels(rem));
  },
);

test.each(paddings)(
  "maps paddingBlockEnd %s to the block end side",
  (padding: InlinePadding, rem) => {
    render(<Inline paddingBlockEnd={padding} data-testid="inline" />);

    const inline = screen.getByTestId("inline");

    expect(inline.getAttribute("data-padding-block-end")).toBe(padding);
    expect(getComputedStyle(inline).paddingBlockEnd).toBe(pixels(rem));
  },
);

test("side-specific padding overrides broad inline and block padding", () => {
  render(
    <Inline
      paddingInline="200"
      paddingBlock="200"
      paddingInlineStart="100"
      paddingInlineEnd="300"
      paddingBlockStart="050"
      paddingBlockEnd="400"
      data-testid="inline"
    />,
  );

  const computed = getComputedStyle(screen.getByTestId("inline"));

  expect(computed.paddingInlineStart).toBe(pixels(0.5));
  expect(computed.paddingInlineEnd).toBe(pixels(1.5));
  expect(computed.paddingBlockStart).toBe(pixels(0.25));
  expect(computed.paddingBlockEnd).toBe(pixels(2));
});

test("keeps children on one row when wrapping is disabled", () => {
  render(<Inline wrap={false} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  expect(inline.getAttribute("data-wrap")).toBe("false");
  expect(getComputedStyle(inline).flexWrap).toBe("nowrap");
});

test.each([
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["stretch", "stretch"],
  ["baseline", "baseline"],
] as const)("aligns items at %s on the vertical axis", (align, cssValue) => {
  render(<Inline align={align} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  expect(inline.getAttribute("data-align")).toBe(align);
  expect(getComputedStyle(inline).alignItems).toBe(cssValue);
});

test.each([
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["between", "space-between"],
  ["around", "space-around"],
  ["evenly", "space-evenly"],
] as const)("justifies items at %s on the horizontal axis", (justify, cssValue) => {
  render(<Inline justify={justify} data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  expect(inline.getAttribute("data-justify")).toBe(justify);
  expect(getComputedStyle(inline).justifyContent).toBe(cssValue);
});

test.each(["section", "ul"] as const)("renders as a semantic %s", (as) => {
  render(<Inline as={as} data-testid="inline" />);

  expect(screen.getByTestId("inline").tagName).toBe(as.toUpperCase());
});

test("forwards native props and a ref to the chosen element", () => {
  const ref = { current: null as HTMLUListElement | null };

  render(
    <Inline as="ul" ref={ref} aria-label="Ingredients" data-testid="inline" id="ingredients">
      <li>Tomatoes</li>
    </Inline>,
  );

  const inline = screen.getByTestId("inline");
  expect(ref.current).toBe(inline);
  expect(inline.getAttribute("aria-label")).toBe("Ingredients");
  expect(inline.id).toBe("ingredients");
});

test("merges a consumer class name", () => {
  render(<Inline className="recipe-tags" data-testid="inline" />);

  const inline = screen.getByTestId("inline");
  expect(inline.classList.contains(styles.inline)).toBe(true);
  expect(inline.classList.contains("recipe-tags")).toBe(true);
});
