import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TextInput } from "./text-input";
import styles from "./text-input.module.css";

afterEach(cleanup);

test("associates its label and help text and submits an uncontrolled value", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  });
  render(
    <form onSubmit={onSubmit}>
      <TextInput
        label="Recipe title"
        name="title"
        defaultValue="Tomato soup"
        helpText="A name to remember"
      />
      <button type="submit">Save</button>
    </form>,
  );

  const input = screen.getByRole("textbox", {
    name: "Recipe title",
    description: "A name to remember",
  }) as HTMLInputElement;
  expect(input.value).toBe("Tomato soup");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).toHaveReturnedWith({ title: "Tomato soup" });
});

test("supports controlled values, string callbacks, native events, and input refs", () => {
  const ref = React.createRef<HTMLInputElement>();
  const onChange = vi.fn();
  const onBlur = vi.fn();
  const onValueChange = vi.fn();
  const { rerender } = render(
    <TextInput
      ref={ref}
      label="Servings"
      type="number"
      value={2}
      min={1}
      onChange={onChange}
      onBlur={onBlur}
      onValueChange={onValueChange}
    />,
  );
  const input = screen.getByRole("spinbutton", { name: "Servings" }) as HTMLInputElement;
  expect(ref.current).toBe(input);
  expect(input.value).toBe("2");
  expect(input.min).toBe("1");
  fireEvent.change(input, { target: { value: "3" } });
  fireEvent.blur(input);
  expect(onValueChange).toHaveBeenCalledWith("3", expect.any(Object));
  expect(onChange).toHaveBeenCalled();
  expect(onBlur).toHaveBeenCalled();
  rerender(<TextInput label="Servings" type="number" value={3} onValueChange={onValueChange} />);
  expect(input.value).toBe("3");
});

test("shows and clears external errors, including when invalid is false", () => {
  const { rerender } = render(
    <TextInput label="Title" helpText="Choose a title" error="Already used" invalid={false} />,
  );
  const input = screen.getByRole("textbox", { name: "Title" });
  const error = screen.getByText("Already used");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toContain(error.id);
  expect(input.getAttribute("aria-describedby")).toContain(screen.getByText("Choose a title").id);

  rerender(<TextInput label="Title" invalid />);
  expect(screen.queryByText("Already used")).toBeNull();
  expect(input.getAttribute("aria-invalid")).toBe("true");

  rerender(<TextInput label="Title" error="" invalid={false} />);
  expect(input.getAttribute("aria-invalid")).not.toBe("true");
});

test("preserves required validation and read-only and disabled behavior", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={onSubmit}>
      <TextInput label="Name" name="name" required />
      <button type="submit">Save</button>
    </form>,
  );
  const input = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(input.validity.valueMissing).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();

  rerender(<TextInput label="Name" readOnly defaultValue="Soup" />);
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).readOnly).toBe(true);
  rerender(<TextInput label="Name" disabled defaultValue="Soup" />);
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).disabled).toBe(true);
});

test("keeps a visually hidden label accessible and separates wrapper and input styling", () => {
  render(
    <TextInput
      label="Search recipes"
      visuallyHiddenLabel
      className="field-custom"
      style={{ marginTop: 8 }}
      inputClassName="input-custom"
      inputStyle={{ width: 120 }}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Search recipes" });
  const label = screen.getByText("Search recipes");
  expect(label.classList.contains(styles.visuallyHidden)).toBe(true);
  expect(input.classList.contains("input-custom")).toBe(true);
  expect(input.parentElement?.classList.contains("field-custom")).toBe(true);
  expect(input.parentElement?.style.marginTop).toBe("8px");
  expect((input as HTMLInputElement).style.width).toBe("120px");
});
