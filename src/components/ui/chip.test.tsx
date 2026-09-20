import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { Chip } from "./chip";
import styles from "./chip.module.css";

afterEach(cleanup);

test("renders a span with its content", () => {
  render(<Chip>weeknight</Chip>);

  const chip = screen.getByText("weeknight");

  expect(chip).toBeInstanceOf(HTMLSpanElement);
  expect(chip.textContent).toBe("weeknight");
});

test("applies the chip CSS module class", () => {
  render(<Chip>vegetarian</Chip>);

  expect(screen.getByText("vegetarian").classList.contains(styles.chip)).toBe(true);
});

test("forwards standard span attributes", () => {
  render(
    <Chip data-testid="recipe-chip" id="vegetarian-chip" title="Dietary label">
      vegetarian
    </Chip>,
  );

  const chip = screen.getByTestId("recipe-chip");

  expect(chip.id).toBe("vegetarian-chip");
  expect(chip.title).toBe("Dietary label");
});

test("merges consumer class names with the chip class", () => {
  render(<Chip className="highlighted">weeknight</Chip>);

  const chip = screen.getByText("weeknight");

  expect(chip.classList.contains(styles.chip)).toBe(true);
  expect(chip.classList.contains("highlighted")).toBe(true);
});
