import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import "../../app/globals.css";
import { Textarea } from "./textarea";
import styles from "./textarea.module.css";

afterEach(cleanup);

test("associates its label and help text and submits an uncontrolled value", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  });
  render(
    <form onSubmit={onSubmit}>
      <Textarea
        label="Recipe notes"
        name="notes"
        defaultValue="Add fresh basil"
        helpText="Tips to remember later."
      />
      <button type="submit">Save</button>
    </form>,
  );

  const textarea = screen.getByRole("textbox", {
    name: "Recipe notes",
    description: "Tips to remember later.",
  }) as HTMLTextAreaElement;
  expect(textarea.value).toBe("Add fresh basil");
  expect(textarea.rows).toBe(3);
  expect(window.getComputedStyle(textarea).resize).toBe("vertical");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveReturnedWith({ notes: "Add fresh basil" });
});

test("forwards native props, events, value callbacks, and the textarea ref", () => {
  const ref = React.createRef<HTMLTextAreaElement>();
  const onValueChange = vi.fn();
  const onChange = vi.fn();
  const onBlur = vi.fn();
  render(
    <Textarea
      ref={ref}
      label="Recipe notes"
      name="notes"
      placeholder="Add notes"
      rows={5}
      maxLength={100}
      autoComplete="off"
      onChange={onChange}
      onBlur={onBlur}
      onValueChange={onValueChange}
    />,
  );

  const textarea = screen.getByRole("textbox", { name: "Recipe notes" }) as HTMLTextAreaElement;
  expect(ref.current).toBe(textarea);
  expect(textarea.name).toBe("notes");
  expect(textarea.placeholder).toBe("Add notes");
  expect(textarea.rows).toBe(5);
  expect(textarea.maxLength).toBe(100);
  expect(textarea.autocomplete).toBe("off");
  expect(textarea.classList.contains(styles.textarea)).toBe(true);

  fireEvent.change(textarea, { target: { value: "Fresh basil" } });
  fireEvent.blur(textarea);
  expect(onChange).toHaveBeenCalledOnce();
  expect(onBlur).toHaveBeenCalledOnce();
  expect(onValueChange).toHaveBeenCalledWith("Fresh basil", expect.any(Object));
});

test("supports controlled values", () => {
  const onValueChange = vi.fn();
  const { rerender } = render(
    <Textarea label="Recipe notes" value="First" onValueChange={onValueChange} />,
  );
  const textarea = screen.getByRole("textbox", { name: "Recipe notes" }) as HTMLTextAreaElement;
  expect(textarea.value).toBe("First");
  fireEvent.change(textarea, { target: { value: "Second" } });
  expect(onValueChange).toHaveBeenCalledWith("Second", expect.any(Object));
  rerender(<Textarea label="Recipe notes" value="Second" onValueChange={onValueChange} />);
  expect(textarea.value).toBe("Second");
});

test("shows and clears errors, including when invalid is false", () => {
  const { rerender } = render(
    <Textarea label="Notes" helpText="Keep this short" error="Add a note." invalid={false} />,
  );
  const textarea = screen.getByRole("textbox", { name: "Notes" });
  const error = screen.getByText("Add a note.");
  expect(textarea.getAttribute("aria-invalid")).toBe("true");
  expect(textarea.getAttribute("aria-describedby")).toContain(error.id);
  expect(textarea.getAttribute("aria-describedby")).toContain(
    screen.getByText("Keep this short").id,
  );

  rerender(<Textarea label="Notes" invalid />);
  expect(screen.queryByText("Add a note.")).toBeNull();
  expect(textarea.getAttribute("aria-invalid")).toBe("true");

  rerender(<Textarea label="Notes" error="  " invalid={false} />);
  expect(textarea.getAttribute("aria-invalid")).not.toBe("true");
});

test("keeps native required validation and read-only and disabled behavior", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={onSubmit}>
      <Textarea label="Notes" name="notes" required />
      <button type="submit">Save</button>
    </form>,
  );
  const textarea = screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement;
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(textarea.validity.valueMissing).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();

  rerender(<Textarea label="Notes" readOnly defaultValue="Soup" />);
  expect((screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement).readOnly).toBe(
    true,
  );
  rerender(<Textarea label="Notes" disabled defaultValue="Soup" />);
  expect((screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement).disabled).toBe(
    true,
  );
});

test("keeps a visually hidden label accessible and separates wrapper and control styling", () => {
  render(
    <Textarea
      label="Private notes"
      visuallyHiddenLabel
      className="field-custom"
      style={{ marginTop: 8 }}
      textareaClassName="textarea-custom"
      textareaStyle={{ width: 120 }}
    />,
  );
  const textarea = screen.getByRole("textbox", { name: "Private notes" }) as HTMLTextAreaElement;
  const label = screen.getByText("Private notes");
  expect(label.classList.contains("visually-hidden")).toBe(true);
  expect(textarea.classList.contains("textarea-custom")).toBe(true);
  expect(textarea.parentElement?.classList.contains("field-custom")).toBe(true);
  expect(textarea.parentElement?.style.marginTop).toBe("8px");
  expect(textarea.style.width).toBe("120px");
});
