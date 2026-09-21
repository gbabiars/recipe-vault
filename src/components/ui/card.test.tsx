import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { Card } from "./card";
import styles from "./card.module.css";

afterEach(cleanup);

test("renders a div with the default card styling and padding", () => {
  render(<Card>Recipe details</Card>);

  const card = screen.getByText("Recipe details");

  expect(card).toBeInstanceOf(HTMLDivElement);
  expect(card.classList.contains(styles.card)).toBe(true);
  expect(card.getAttribute("data-padding")).toBe("default");
});

test.each([
  ["section", "Recipe details", "SECTION"],
  ["li", "Recipe summary", "LI"],
] as const)("renders as a semantic %s element", (as, content, tagName) => {
  render(
    <Card as={as} data-testid="card">
      {content}
    </Card>,
  );

  expect(screen.getByTestId("card").tagName).toBe(tagName);
});

test("supports removing the default padding", () => {
  render(
    <Card padding="none" data-testid="card">
      Recipe summary
    </Card>,
  );

  expect(screen.getByTestId("card").getAttribute("data-padding")).toBe("none");
});

test("forwards native props, refs, and consumer class names", () => {
  const ref = { current: null as HTMLDivElement | null };

  render(
    <Card
      ref={ref}
      aria-label="Recipe card"
      className="featured-card"
      data-testid="card"
      id="recipe-card"
      title="Recipe details"
    >
      Recipe details
    </Card>,
  );

  const card = screen.getByTestId("card");

  expect(ref.current).toBe(card);
  expect(card.getAttribute("aria-label")).toBe("Recipe card");
  expect(card.classList.contains(styles.card)).toBe(true);
  expect(card.classList.contains("featured-card")).toBe(true);
  expect(card.id).toBe("recipe-card");
  expect(card.title).toBe("Recipe details");
});
