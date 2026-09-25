import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../../app/globals.css";

import { Text, type TextAppearance } from "./text";
import styles from "./text.module.css";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

test("renders a span with medium sizing by default", () => {
  render(<Text>Recipe title</Text>);

  const text = screen.getByText("Recipe title");

  expect(text).toBeInstanceOf(HTMLSpanElement);
  expect(text.getAttribute("data-size")).toBe("medium");
  expect(text.hasAttribute("data-appearance")).toBe(false);
  expect(text.classList.contains(styles.text)).toBe(true);
});

test("inherits its parent's color when appearance is omitted", () => {
  render(
    <div style={{ color: "rgb(12, 34, 56)" }}>
      <Text>Inherited color</Text>
    </div>,
  );

  const text = screen.getByText("Inherited color");

  expect(text.hasAttribute("data-appearance")).toBe(false);
  expect(getComputedStyle(text).color).toBe("rgb(12, 34, 56)");
});

const appearanceColors: Record<TextAppearance, { light: string; dark: string }> = {
  primary: { light: "rgb(23, 23, 23)", dark: "rgb(245, 245, 245)" },
  secondary: { light: "rgb(82, 82, 82)", dark: "rgb(163, 163, 163)" },
  disabled: { light: "rgb(163, 163, 163)", dark: "rgb(82, 82, 82)" },
  success: { light: "rgb(21, 128, 61)", dark: "rgb(134, 239, 172)" },
  warning: { light: "rgb(146, 64, 14)", dark: "rgb(252, 211, 77)" },
  error: { light: "rgb(185, 28, 28)", dark: "rgb(252, 165, 165)" },
};

test.each(["light", "dark"] as const)("uses semantic appearance colors in %s theme", (theme) => {
  document.documentElement.dataset.theme = theme;

  render(
    <div style={{ color: "rgb(12, 34, 56)" }}>
      {(Object.keys(appearanceColors) as TextAppearance[]).map((appearance) => (
        <Text as="p" key={appearance} size="large" appearance={appearance}>
          {appearance}
        </Text>
      ))}
    </div>,
  );

  for (const [appearance, colors] of Object.entries(appearanceColors)) {
    const text = screen.getByText(appearance);
    expect(text).toBeInstanceOf(HTMLParagraphElement);
    expect(text.getAttribute("data-size")).toBe("large");
    expect(text.getAttribute("data-appearance")).toBe(appearance);
    expect(getComputedStyle(text).color).toBe(colors[theme]);
  }
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
