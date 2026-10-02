import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import "../../../app/globals.css";
import { ComboboxField } from "./combobox";

function TestIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="combobox-option-icon" />;
}

test("renders decorative option icons in popup rows and keeps selected chips text-only", async () => {
  render(
    <ComboboxField
      name="tags"
      label="Tags"
      multiple
      options={[
        { value: "vegan", label: "Vegan", icon: TestIcon },
        { value: "vegetarian", label: "Vegetarian" },
      ]}
      defaultValue={["vegan"]}
    />,
  );

  const input = screen.getByRole("combobox", { name: "Tags" });
  fireEvent.click(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });

  const option = await screen.findByRole("option", { name: "Vegan" });
  const icon = within(option).getByTestId("combobox-option-icon");
  expect(option.firstElementChild).toBe(icon);
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.getAttribute("focusable")).toBe("false");
  expect(screen.getByRole("option", { name: "Vegetarian" }).querySelector("svg")).toBeNull();

  fireEvent.keyDown(input, { key: "Escape" });
  const removeButton = await screen.findByRole("button", { name: "Remove Vegan" });
  const chip = removeButton.parentElement;
  expect(chip).not.toBeNull();
  expect(chip?.querySelector('[data-testid="combobox-option-icon"]')).toBeNull();
});

test("shows a decorative marker only for required combobox fields", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={onSubmit}>
      <ComboboxField name="tags" label="Tags" options={[]} />
      <button type="submit">Save</button>
    </form>,
  );

  const optionalInput = screen.getByRole("combobox", { name: "Tags" });
  expect(screen.queryByText("*", { exact: true })).toBeNull();
  expect(optionalInput.getAttribute("aria-required")).toBeNull();

  rerender(
    <form onSubmit={onSubmit}>
      <ComboboxField name="tags" label="Tags" options={[]} required />
      <button type="submit">Save</button>
    </form>,
  );

  const input = screen.getByRole("combobox", { name: "Tags" });
  const marker = screen.getByText("*", { exact: true });
  expect(marker.getAttribute("aria-hidden")).toBe("true");
  expect(input.getAttribute("aria-required")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).not.toHaveBeenCalled();

  rerender(<ComboboxField name="tags" label="Tags" options={[]} required disabled />);
  expect(screen.getByText("*", { exact: true }).hasAttribute("data-disabled")).toBe(true);
  expect(screen.getByRole("combobox", { name: "Tags" }).hasAttribute("disabled")).toBe(true);
});
