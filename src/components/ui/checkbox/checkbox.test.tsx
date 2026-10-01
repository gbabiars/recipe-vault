import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { CheckboxGroup, CheckboxGroupItem, CheckboxInput } from "./checkbox";

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
  expect(screen.queryByText("*", { exact: true })).toBeNull();
  fireEvent.click(screen.getByText("Email me updates"));
  expect(new FormData(container.querySelector("form")!).get("updates")).toBe("yes");
  fireEvent.click(checkbox);
  expect(new FormData(container.querySelector("form")!).has("updates")).toBe(false);
});

test("standalone required checkbox keeps a decorative marker and native required behavior", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const inputRef = React.createRef<HTMLInputElement>();
  const { rerender } = render(
    <form onSubmit={onSubmit}>
      <CheckboxInput name="agreement" value="yes" label="I agree" required inputRef={inputRef} />
      <button type="submit">Save</button>
    </form>,
  );

  const checkbox = screen.getByRole("checkbox", { name: "I agree" });
  const marker = screen.getByText("*", { exact: true });
  expect(inputRef.current?.required).toBe(true);
  expect(checkbox.getAttribute("data-required")).not.toBeNull();
  expect(marker.getAttribute("aria-hidden")).toBe("true");
  expect(checkbox.closest("label")?.querySelector("span[aria-hidden='true']")).toBe(marker);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).not.toHaveBeenCalled();

  rerender(
    <CheckboxInput label="I agree" required visuallyHiddenLabel disabled inputRef={inputRef} />,
  );
  const disabledMarker = screen.getByText("*", { exact: true });
  expect(screen.getByRole("checkbox", { name: "I agree" }).hasAttribute("data-disabled")).toBe(
    true,
  );
  expect(disabledMarker.closest("label")?.classList.contains("visually-hidden")).toBe(true);
  expect(disabledMarker.hasAttribute("data-disabled")).toBe(true);
  expect(disabledMarker.getAttribute("aria-hidden")).toBe("true");
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
      <CheckboxInput name="disabled" label="Disabled" disabled helpText="This setting is locked." />
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
  const disabled = screen.getByRole("checkbox", {
    name: "Disabled",
    description: "This setting is locked.",
  });
  expect(disabled.getAttribute("aria-disabled")).toBe("true");
  expect(screen.getByText("This setting is locked.").hasAttribute("aria-disabled")).toBe(true);
  expect(disabled.hasAttribute("data-disabled")).toBe(true);
  expect(screen.getByRole("checkbox", { name: "Mixed" }).getAttribute("aria-checked")).toBe(
    "mixed",
  );
  expect(screen.getByText("Mixed").closest("label")?.className).toContain("visually-hidden");
});

test("checkbox group labels independently toggled items and submits repeated form values", () => {
  const groupRef = React.createRef<HTMLDivElement>();
  const itemRef = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <CheckboxGroup
        label="Ingredients"
        name="ingredients"
        helpText="Choose ingredients."
        error="Choose an ingredient."
        ref={groupRef}
      >
        <CheckboxGroupItem
          value="basil"
          label="Basil"
          helpText="Fresh leaves."
          defaultChecked
          ref={itemRef}
        />
        <CheckboxGroupItem value="parsley" label="Parsley" />
      </CheckboxGroup>
    </form>,
  );
  const group = screen.getAllByRole("group", { name: "Ingredients" })[1];
  expect(groupRef.current).toBe(group);
  expect(itemRef.current).toBe(screen.getByRole("checkbox", { name: "Basil" }));
  expect(group.closest("fieldset")?.firstElementChild?.textContent).toBe("Ingredients");
  expect(screen.queryByText("*", { exact: true })).toBeNull();
  expect(
    screen.getByRole("checkbox", {
      name: "Basil",
      description: "Choose ingredients. Choose an ingredient. Fresh leaves.",
    }),
  ).toBeTruthy();
  expect(group.querySelector("[data-invalid]")).toBeTruthy();
  expect(new FormData(container.querySelector("form")!).getAll("ingredients")).toEqual(["basil"]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Parsley" }));
  expect(new FormData(container.querySelector("form")!).getAll("ingredients")).toEqual([
    "basil",
    "parsley",
  ]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Basil" }));
  expect(new FormData(container.querySelector("form")!).getAll("ingredients")).toEqual(["parsley"]);
});

test("checkbox group items support consumer-controlled selection", () => {
  const onCheckedChange = vi.fn();
  function ControlledGroup() {
    const [checked, setChecked] = React.useState(false);
    return (
      <CheckboxGroup label="Ingredients" name="ingredients">
        <CheckboxGroupItem
          value="basil"
          label="Basil"
          checked={checked}
          onCheckedChange={(nextChecked, eventDetails) => {
            onCheckedChange(nextChecked, eventDetails);
            setChecked(nextChecked);
          }}
        />
        <CheckboxGroupItem value="parsley" label="Parsley" defaultChecked />
      </CheckboxGroup>
    );
  }
  render(<ControlledGroup />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Basil" }));
  expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  expect(screen.getByRole("checkbox", { name: "Basil" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("checkbox", { name: "Parsley" }).getAttribute("aria-checked")).toBe(
    "true",
  );
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
