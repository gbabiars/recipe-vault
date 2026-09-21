import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { Heading } from "./heading";
import styles from "./heading.module.css";

afterEach(cleanup);

test("renders an h1 with level-1 styling by default", () => {
  render(<Heading>Recipe Vault</Heading>);

  const heading = screen.getByRole("heading", { level: 1, name: "Recipe Vault" });

  expect(heading).toBeInstanceOf(HTMLHeadingElement);
  expect(heading.getAttribute("data-level")).toBe("1");
  expect(heading.classList.contains(styles.heading)).toBe(true);
});

test.each([1, 2, 3, 4, 5, 6] as const)(
  "renders level %s as its matching heading element",
  (level) => {
    render(<Heading level={level}>Level {level}</Heading>);

    const heading = screen.getByRole("heading", { level, name: `Level ${level}` });

    expect(heading.tagName).toBe(`H${level}`);
    expect(heading.getAttribute("data-level")).toBe(String(level));
  },
);

test("allows the rendered element to differ from the visual level", () => {
  render(
    <Heading level={3} as="h2">
      Section heading
    </Heading>,
  );

  const heading = screen.getByRole("heading", { level: 2, name: "Section heading" });

  expect(heading).toBeInstanceOf(HTMLHeadingElement);
  expect(heading.getAttribute("data-level")).toBe("3");
});

test("renders as an intrinsic element and forwards native props and refs", () => {
  const ref = { current: null as HTMLParagraphElement | null };

  render(
    <Heading
      as="p"
      ref={ref}
      aria-label="Recipe summary"
      data-testid="recipe-summary"
      id="summary"
      title="Recipe summary"
    >
      A simple recipe summary.
    </Heading>,
  );

  const heading = screen.getByTestId("recipe-summary");

  expect(heading).toBeInstanceOf(HTMLParagraphElement);
  expect(ref.current).toBe(heading);
  expect(heading.getAttribute("aria-label")).toBe("Recipe summary");
  expect(heading.id).toBe("summary");
  expect(heading.title).toBe("Recipe summary");
});

test("merges consumer class names with the heading class", () => {
  render(
    <Heading className="featured-heading" level={2}>
      Featured recipes
    </Heading>,
  );

  const heading = screen.getByRole("heading", { level: 2, name: "Featured recipes" });

  expect(heading.classList.contains(styles.heading)).toBe(true);
  expect(heading.classList.contains("featured-heading")).toBe(true);
});

test.each([
  [1, "36px", "44px"],
  [2, "30px", "36px"],
  [3, "24px", "30px"],
  [4, "20px", "26px"],
  [5, "18px", "24px"],
  [6, "16px", "22px"],
] as const)("applies the level-%s typography scale", (level, fontSize, lineHeight) => {
  render(<Heading level={level}>Typography sample</Heading>);

  const heading = screen.getByRole("heading", { level, name: "Typography sample" });
  const computedStyle = window.getComputedStyle(heading);

  expect(computedStyle.fontSize).toBe(fontSize);
  expect(computedStyle.lineHeight).toBe(lineHeight);
  expect(computedStyle.fontWeight).toBe("600");
});
