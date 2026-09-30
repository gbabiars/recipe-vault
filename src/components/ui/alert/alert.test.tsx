import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../../app/globals.css";

import { Alert } from "./alert";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

test("renders a named section with a fixed level-three heading and no live role", () => {
  render(<Alert description="Review the recipe details." title="Check ingredients" />);

  const alert = screen.getByRole("region", { name: "Check ingredients" });
  const heading = screen.getByRole("heading", { level: 5, name: "Check ingredients" });

  expect(alert).toBeInstanceOf(HTMLElement);
  expect(alert.tagName).toBe("SECTION");
  expect(alert.getAttribute("aria-labelledby")).toBe(heading.id);
  expect(alert.getAttribute("role")).toBeNull();
  expect(alert.getAttribute("aria-live")).toBeNull();
  expect(alert.getAttribute("data-variant")).toBe("subtle");
  expect(alert.getAttribute("data-padding")).toBe("medium");
});

test("renders a decorative icon and a rich description", () => {
  render(
    <Alert
      description={
        <>
          Review the <a href="https://example.com/recipes/1/edit">recipe details</a>.
        </>
      }
      title="Check ingredients"
      variant="warning"
    />,
  );

  const alert = screen.getByRole("region", { name: "Check ingredients" });
  const icon = alert.querySelector("svg");

  expect(icon?.getAttribute("aria-hidden")).toBe("true");
  expect(icon?.getAttribute("focusable")).toBe("false");
  expect(screen.getByRole("link", { name: "recipe details" }).getAttribute("href")).toBe(
    "https://example.com/recipes/1/edit",
  );
});

test("forwards section attributes, class names, and refs", () => {
  const ref = { current: null as HTMLElement | null };

  render(
    <Alert
      aria-describedby="help"
      className="featured-alert"
      data-testid="alert"
      id="ingredient-alert"
      ref={ref}
      title="Check ingredients"
      description="Review the recipe details."
    />,
  );

  const alert = screen.getByTestId("alert");

  expect(ref.current).toBe(alert);
  expect(alert.id).toBe("ingredient-alert");
  expect(alert.getAttribute("aria-describedby")).toBe("help");
  expect(alert.classList.contains("featured-alert")).toBe(true);
});

test.each([
  ["light", "default", "rgb(245, 245, 245)", "rgb(229, 229, 229)", "rgb(82, 82, 82)"],
  ["light", "danger", "rgb(254, 242, 242)", "rgb(254, 202, 202)", "rgb(220, 38, 38)"],
  ["light", "warning", "rgb(255, 251, 235)", "rgb(253, 230, 138)", "rgb(217, 119, 6)"],
  ["light", "success", "rgb(240, 253, 244)", "rgb(187, 247, 208)", "rgb(22, 163, 74)"],
  ["dark", "default", "rgb(38, 38, 38)", "rgb(38, 38, 38)", "rgb(163, 163, 163)"],
  ["dark", "danger", "rgb(69, 10, 10)", "rgb(127, 29, 29)", "rgb(248, 113, 113)"],
  ["dark", "warning", "rgb(69, 26, 3)", "rgb(120, 53, 15)", "rgb(251, 191, 36)"],
  ["dark", "success", "rgb(5, 46, 22)", "rgb(20, 83, 45)", "rgb(74, 222, 128)"],
] as const)(
  "uses %s theme colors for the %s variant",
  (theme, variant, background, border, iconColor) => {
    document.documentElement.dataset.theme = theme;

    render(
      <Alert
        data-testid="alert"
        description="Review the recipe details."
        title="Check ingredients"
        variant={variant}
      />,
    );

    const alert = screen.getByTestId("alert");
    const icon = alert.querySelector("svg");
    const title = screen.getByRole("heading", { level: 5, name: "Check ingredients" });
    const description = alert.querySelector("p");
    const style = getComputedStyle(alert);

    expect(style.backgroundColor).toBe(background);
    expect(style.borderTopColor).toBe(border);
    expect(icon).not.toBeNull();
    expect(getComputedStyle(icon as SVGSVGElement).color).toBe(iconColor);
    expect(getComputedStyle(title).color).toBe(
      theme === "light" ? "rgb(23, 23, 23)" : "rgb(245, 245, 245)",
    );
    expect(description).not.toBeNull();
    expect(getComputedStyle(description as HTMLParagraphElement).color).toBe(
      theme === "light" ? "rgb(82, 82, 82)" : "rgb(163, 163, 163)",
    );
  },
);
