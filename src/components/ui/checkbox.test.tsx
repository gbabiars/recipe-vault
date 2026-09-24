import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { CheckboxGroup, CheckboxGroupItem, CheckboxInput } from "./checkbox";

afterEach(cleanup);

test("standalone checkbox owns its label, help text, and form value", () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const ref = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <CheckboxInput
        name="updates"
        value="yes"
        label="Email me updates"
        helpText="Occasional recipe news."
        inputRef={inputRef}
        ref={ref}
      />
    </form>,
  );
  const checkbox = screen.getByRole("checkbox", { name: "Email me updates" });
  expect(
    screen.getByRole("checkbox", {
      name: "Email me updates",
      description: "Occasional recipe news.",
    }),
  ).toBe(checkbox);
  expect(ref.current).toBe(checkbox);
  expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
  fireEvent.click(screen.getByText("Email me updates"));
  expect(new FormData(container.querySelector("form")!).get("updates")).toBe("yes");
  fireEvent.click(checkbox);
  expect(new FormData(container.querySelector("form")!).has("updates")).toBe(false);
});

test("standalone checkbox supports controlled, read-only, disabled, invalid, and mixed states", () => {
  const onCheckedChange = vi.fn();
  render(
    <>
      <CheckboxInput
        name="controlled"
        label="Controlled"
        checked
        onCheckedChange={onCheckedChange}
        error="Check this setting."
      />
      <CheckboxInput name="locked" label="Locked" readOnly defaultChecked />
      <CheckboxInput name="disabled" label="Disabled" disabled />
      <CheckboxInput name="mixed" label="Mixed" indeterminate visuallyHiddenLabel />
    </>,
  );
  const controlled = screen.getByRole("checkbox", { name: "Controlled" });
  fireEvent.click(controlled);
  expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  expect(controlled.getAttribute("aria-checked")).toBe("true");
  expect(controlled.hasAttribute("data-invalid")).toBe(true);
  expect(
    screen.getByRole("checkbox", { name: "Controlled", description: "Check this setting." }),
  ).toBe(controlled);
  fireEvent.click(screen.getByRole("checkbox", { name: "Locked" }));
  expect(screen.getByRole("checkbox", { name: "Locked" }).getAttribute("aria-checked")).toBe(
    "true",
  );
  expect(screen.getByRole("checkbox", { name: "Disabled" }).hasAttribute("data-disabled")).toBe(
    true,
  );
  expect(screen.getByRole("checkbox", { name: "Mixed" }).getAttribute("aria-checked")).toBe(
    "mixed",
  );
  expect(screen.getByText("Mixed").className).toContain("visually-hidden");
});

test("checkbox group has a legend, repeated form values, and select-all mixed state", () => {
  const onValueChange = vi.fn();
  const groupRef = React.createRef<HTMLDivElement>();
  const itemRef = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <CheckboxGroup
        label="Ingredients"
        name="ingredients"
        helpText="Choose ingredients."
        error="Choose an ingredient."
        defaultValue={["basil"]}
        allValues={["basil", "parsley"]}
        onValueChange={onValueChange}
        ref={groupRef}
      >
        <CheckboxGroupItem parent label="All ingredients" />
        <CheckboxGroupItem value="basil" label="Basil" helpText="Fresh leaves." ref={itemRef} />
        <CheckboxGroupItem value="parsley" label="Parsley" />
      </CheckboxGroup>
    </form>,
  );
  const group = screen.getAllByRole("group", { name: "Ingredients" })[1];
  expect(groupRef.current).toBe(group);
  expect(itemRef.current).toBe(screen.getByRole("checkbox", { name: "Basil" }));
  expect(group.closest("fieldset")?.firstElementChild?.textContent).toBe("Ingredients");
  expect(
    screen.getByRole("checkbox", {
      name: "Basil",
      description: "Choose ingredients. Choose an ingredient. Fresh leaves.",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "All ingredients" }).getAttribute("aria-checked"),
  ).toBe("mixed");
  fireEvent.click(screen.getByRole("checkbox", { name: "All ingredients" }));
  expect(onValueChange).toHaveBeenCalledWith(["basil", "parsley"], expect.anything());
  expect(new FormData(container.querySelector("form")!).getAll("ingredients")).toEqual([
    "basil",
    "parsley",
  ]);
  fireEvent.click(screen.getByRole("checkbox", { name: "All ingredients" }));
  expect(new FormData(container.querySelector("form")!).getAll("ingredients")).toEqual([]);
});

test("disabled checkbox group and hidden legend", () => {
  render(
    <CheckboxGroup label="Ingredients" name="ingredients" disabled visuallyHiddenLabel>
      <CheckboxGroupItem value="basil" label="Basil" />
    </CheckboxGroup>,
  );
  expect(screen.getAllByRole("group", { name: "Ingredients" })).toHaveLength(2);
  expect(screen.getByText("Ingredients").className).toContain("visually-hidden");
  expect(screen.getByRole("checkbox", { name: "Basil" }).hasAttribute("data-disabled")).toBe(true);
});

test("space toggles a standalone checkbox", () => {
  render(<CheckboxInput label="Updates" />);
  const checkbox = screen.getByRole("checkbox", { name: "Updates" });
  checkbox.focus();
  fireEvent.keyDown(checkbox, { key: " " });
  fireEvent.keyUp(checkbox, { key: " " });
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
});
