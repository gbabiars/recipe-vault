import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";

afterEach(cleanup);

test("connects the label and description to the input", () => {
  render(
    <Field name="title">
      <FieldLabel>Recipe title</FieldLabel>
      <Input />
      <FieldDescription>A short name for your recipe.</FieldDescription>
      <FieldError />
    </Field>,
  );

  const input = screen.getByRole("textbox", {
    name: "Recipe title",
    description: "A short name for your recipe.",
  });
  expect(input).toBeInstanceOf(HTMLInputElement);
});

test("submits the input value through a native form", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  });

  render(
    <form onSubmit={onSubmit}>
      <Field name="title">
        <FieldLabel>Recipe title</FieldLabel>
        <Input defaultValue="Tomato soup" />
      </Field>
      <button type="submit">Save</button>
    </form>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveReturnedWith({ title: "Tomato soup" });
});

test("disables the input and styles the field parts", () => {
  render(
    <Field disabled>
      <FieldLabel>Recipe title</FieldLabel>
      <Input />
      <FieldDescription>Locked for editing.</FieldDescription>
    </Field>,
  );

  const input = screen.getByRole("textbox", { name: "Recipe title" }) as HTMLInputElement;
  expect(input.disabled).toBe(true);
  expect(input.hasAttribute("data-disabled")).toBe(true);
  expect(screen.getByText("Locked for editing.").hasAttribute("data-disabled")).toBe(true);
});

test("exposes an external invalid state and its error message", () => {
  render(
    <Field invalid>
      <FieldLabel>Recipe title</FieldLabel>
      <Input />
      <FieldError match={true}>This title is already in use.</FieldError>
    </Field>,
  );

  const input = screen.getByRole("textbox", { name: "Recipe title" });
  expect(input.hasAttribute("data-invalid")).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("This title is already in use.")).toBeTruthy();
});

test("keeps native required validation for form submission", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

  render(
    <form onSubmit={onSubmit}>
      <Field name="title">
        <FieldLabel>Recipe title</FieldLabel>
        <Input required />
        <FieldError />
      </Field>
      <button type="submit">Save</button>
    </form>,
  );

  const input = screen.getByRole("textbox", { name: "Recipe title" }) as HTMLInputElement;
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(input.validity.valueMissing).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();
});
