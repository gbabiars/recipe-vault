import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import "../../../app/globals.css";
import { ComboboxField } from "./combobox";

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
