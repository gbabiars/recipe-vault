import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import "../../app/globals.css";
import { Input } from "./input";
import styles from "./input.module.css";

afterEach(cleanup);

test("forwards native props, Base UI value callbacks, classes, and the input ref", () => {
  const ref = React.createRef<HTMLInputElement>();
  const onValueChange = vi.fn();

  render(
    <Input
      ref={ref}
      aria-label="Recipe title"
      name="title"
      placeholder="Title"
      autoComplete="off"
      className="custom-input"
      onValueChange={onValueChange}
    />,
  );

  const input = screen.getByRole("textbox", { name: "Recipe title" }) as HTMLInputElement;
  expect(ref.current).toBe(input);
  expect(input.name).toBe("title");
  expect(input.placeholder).toBe("Title");
  expect(input.autocomplete).toBe("off");
  expect(input.classList.contains(styles.input)).toBe(true);
  expect(input.classList.contains("custom-input")).toBe(true);

  fireEvent.change(input, { target: { value: "Soup" } });
  expect(onValueChange).toHaveBeenCalledWith("Soup", expect.any(Object));
});

test("has a computed 36px height", () => {
  render(<Input aria-label="Recipe title" />);

  const input = screen.getByRole("textbox", { name: "Recipe title" });
  expect(window.getComputedStyle(input).height).toBe("36px");
});
