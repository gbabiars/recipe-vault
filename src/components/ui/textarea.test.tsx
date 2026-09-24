import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import "../../app/globals.css";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Textarea } from "./textarea";
import styles from "./textarea.module.css";

afterEach(cleanup);

test("forwards textarea props, value changes, state styling, and the textarea ref", () => {
  const ref = React.createRef<HTMLTextAreaElement>();
  const onValueChange = vi.fn();
  const onChange = vi.fn();

  render(
    <Field>
      <Textarea
        ref={ref}
        aria-label="Recipe notes"
        name="notes"
        placeholder="Add notes"
        rows={5}
        maxLength={100}
        className={(state) => (state.disabled ? "locked" : "custom-textarea")}
        style={(state) => ({ opacity: state.disabled ? 0.5 : 1 })}
        onChange={onChange}
        onValueChange={onValueChange}
      />
    </Field>,
  );

  const textarea = screen.getByRole("textbox", { name: "Recipe notes" }) as HTMLTextAreaElement;
  expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
  expect(ref.current).toBe(textarea);
  expect(textarea.name).toBe("notes");
  expect(textarea.placeholder).toBe("Add notes");
  expect(textarea.rows).toBe(5);
  expect(textarea.maxLength).toBe(100);
  expect(textarea.classList.contains(styles.textarea)).toBe(true);
  expect(textarea.classList.contains("custom-textarea")).toBe(true);
  expect(textarea.style.opacity).toBe("1");

  fireEvent.change(textarea, { target: { value: "Fresh basil" } });
  expect(onChange).toHaveBeenCalledOnce();
  expect(onValueChange).toHaveBeenCalledWith("Fresh basil", expect.any(Object));
});

test("defaults to three rows and allows a string class", () => {
  render(
    <Field>
      <Textarea aria-label="Recipe notes" className="custom-textarea" />
    </Field>,
  );

  const textarea = screen.getByRole("textbox", { name: "Recipe notes" }) as HTMLTextAreaElement;
  expect(textarea.rows).toBe(3);
  expect(textarea.classList.contains(styles.textarea)).toBe(true);
  expect(textarea.classList.contains("custom-textarea")).toBe(true);
  expect(window.getComputedStyle(textarea).resize).toBe("vertical");
});

test("connects the Field label and description", () => {
  render(
    <Field name="notes">
      <FieldLabel>Recipe notes</FieldLabel>
      <Textarea />
      <FieldDescription>Tips to remember later.</FieldDescription>
    </Field>,
  );

  expect(
    screen.getByRole("textbox", {
      name: "Recipe notes",
      description: "Tips to remember later.",
    }),
  ).toBeInstanceOf(HTMLTextAreaElement);
});

test("inherits the disabled and invalid Field states", () => {
  render(
    <>
      <Field disabled>
        <FieldLabel>Locked notes</FieldLabel>
        <Textarea className={(state) => (state.disabled ? "locked" : "unlocked")} />
      </Field>
      <Field invalid>
        <FieldLabel>Invalid notes</FieldLabel>
        <Textarea />
        <FieldError match={true}>Add a note.</FieldError>
      </Field>
    </>,
  );

  const disabled = screen.getByRole("textbox", { name: "Locked notes" }) as HTMLTextAreaElement;
  expect(disabled.disabled).toBe(true);
  expect(disabled.hasAttribute("data-disabled")).toBe(true);
  expect(disabled.classList.contains("locked")).toBe(true);

  const invalid = screen.getByRole("textbox", { name: "Invalid notes" });
  expect(invalid.hasAttribute("data-invalid")).toBe(true);
  expect(invalid.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Add a note.")).toBeTruthy();
});

test("keeps native required validation and submits the textarea value", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  });

  render(
    <form onSubmit={onSubmit}>
      <Field name="notes">
        <FieldLabel>Recipe notes</FieldLabel>
        <Textarea required />
        <FieldError />
      </Field>
      <button type="submit">Save</button>
    </form>,
  );

  const textarea = screen.getByRole("textbox", { name: "Recipe notes" }) as HTMLTextAreaElement;
  const button = screen.getByRole("button", { name: "Save" });
  fireEvent.click(button);
  expect(textarea.validity.valueMissing).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();

  fireEvent.change(textarea, { target: { value: "Add fresh basil" } });
  fireEvent.click(button);
  expect(onSubmit).toHaveReturnedWith({ notes: "Add fresh basil" });
});
