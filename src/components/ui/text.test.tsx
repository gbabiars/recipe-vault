import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { Text } from "./text";
import styles from "./text.module.css";

afterEach(cleanup);

test("renders a span with medium sizing by default", () => {
  render(<Text>Recipe title</Text>);

  const text = screen.getByText("Recipe title");

  expect(text).toBeInstanceOf(HTMLSpanElement);
  expect(text.getAttribute("data-size")).toBe("medium");
  expect(text.classList.contains(styles.text)).toBe(true);
});

test.each(["small", "medium", "large"] as const)("sets the %s data-size", (size) => {
  render(<Text size={size}>{size} text</Text>);

  expect(screen.getByText(`${size} text`).getAttribute("data-size")).toBe(size);
});

test("renders as an intrinsic element and forwards native props", () => {
  render(
    <Text as="p" aria-label="Recipe summary" data-testid="recipe-summary" id="summary">
      A simple recipe summary.
    </Text>,
  );

  const text = screen.getByTestId("recipe-summary");

  expect(text).toBeInstanceOf(HTMLParagraphElement);
  expect(text.getAttribute("aria-label")).toBe("Recipe summary");
  expect(text.id).toBe("summary");
});

test("forwards a ref to the rendered intrinsic element", () => {
  const ref = { current: null as HTMLHeadingElement | null };

  render(
    <Text as="h2" ref={ref}>
      Ingredients
    </Text>,
  );

  expect(ref.current).toBe(screen.getByRole("heading", { level: 2, name: "Ingredients" }));
});

test("merges consumer class names with the text class", () => {
  render(
    <Text className="recipe-copy" size="large">
      Recipe copy
    </Text>,
  );

  const text = screen.getByText("Recipe copy");

  expect(text.getAttribute("data-size")).toBe("large");
  expect(text.classList.contains(styles.text)).toBe(true);
  expect(text.classList.contains("recipe-copy")).toBe(true);
});
