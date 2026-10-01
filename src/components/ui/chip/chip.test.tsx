import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Chip } from "./chip";
import styles from "./chip.module.css";

test("renders a span with its content", () => {
  render(<Chip>weeknight</Chip>);

  const chip = screen.getByText("weeknight");

  expect(chip).toBeInstanceOf(HTMLSpanElement);
  expect(chip.textContent).toBe("weeknight");
  expect(screen.queryByRole("button")).toBeNull();
});

test("calls onRemove from a labeled trailing button without removing the Chip", () => {
  const onRemove = vi.fn();
  render(
    <Chip onRemove={onRemove} removeLabel="Remove vegetarian">
      vegetarian
    </Chip>,
  );

  const removeButton = screen.getByRole("button", { name: "Remove vegetarian" });

  expect(removeButton.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  fireEvent.click(removeButton);

  expect(onRemove).toHaveBeenCalledOnce();
  expect(screen.getByText("vegetarian").textContent).toBe("vegetarian");
});

test("keeps remove-button clicks from reaching the Chip span", () => {
  const onClick = vi.fn();
  const onRemove = vi.fn();
  render(
    <Chip onClick={onClick} onRemove={onRemove} removeLabel="Remove vegetarian">
      vegetarian
    </Chip>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Remove vegetarian" }));

  expect(onRemove).toHaveBeenCalledOnce();
  expect(onClick).not.toHaveBeenCalled();
});

test("applies the chip CSS module class", () => {
  render(<Chip data-testid="vegetarian-chip">vegetarian</Chip>);

  expect(screen.getByTestId("vegetarian-chip").classList.contains(styles.chip)).toBe(true);
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
  render(
    <Chip className="highlighted" data-testid="weeknight-chip">
      weeknight
    </Chip>,
  );

  const chip = screen.getByTestId("weeknight-chip");

  expect(chip.classList.contains(styles.chip)).toBe(true);
  expect(chip.classList.contains("highlighted")).toBe(true);
});
