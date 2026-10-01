import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { RadioGroup, RadioGroupItem } from "./radio";

function options(itemRef?: React.Ref<HTMLElement>) {
  return (
    <>
      <RadioGroupItem
        value="private"
        label="Private"
        helpText="Only you can see it."
        ref={itemRef}
      />
      <RadioGroupItem value="shared" label="Shared" />
    </>
  );
}

test("radio group owns its label and descriptions and submits the selected value", () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const groupRef = React.createRef<HTMLDivElement>();
  const itemRef = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <RadioGroup
        label="Visibility"
        helpText="Choose who sees this recipe."
        name="visibility"
        defaultValue="private"
        inputRef={inputRef}
        ref={groupRef}
      >
        {options(itemRef)}
      </RadioGroup>
    </form>,
  );
  const group = screen.getByRole("radiogroup", { name: "Visibility" });
  expect(groupRef.current).toBe(group);
  expect(itemRef.current).toBe(screen.getByRole("radio", { name: "Private" }));
  expect(group.closest("fieldset")?.firstElementChild?.textContent).toBe("Visibility");
  expect(
    group.closest("fieldset")?.firstElementChild?.querySelector("[aria-hidden='true']"),
  ).toBeNull();
  expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
  expect(
    screen.getByRole("radio", {
      name: "Private",
      description: "Choose who sees this recipe. Only you can see it.",
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Shared"));
  expect(new FormData(container.querySelector("form")!).get("visibility")).toBe("shared");
});

test("space selects a radio option", () => {
  render(
    <RadioGroup label="Visibility" name="visibility" defaultValue="private">
      {options()}
    </RadioGroup>,
  );
  const shared = screen.getByRole("radio", { name: "Shared" });
  shared.focus();
  fireEvent.keyDown(shared, { key: " " });
  fireEvent.keyUp(shared, { key: " " });
  expect(shared.getAttribute("aria-checked")).toBe("true");
});

test("controlled radio group reports changes and displays external errors", () => {
  const onValueChange = vi.fn();
  render(
    <RadioGroup
      label="Visibility"
      name="visibility"
      value="private"
      onValueChange={onValueChange}
      error="Choose a visibility setting."
    >
      {options()}
    </RadioGroup>,
  );
  fireEvent.click(screen.getByRole("radio", { name: "Shared" }));
  expect(onValueChange).toHaveBeenCalledWith("shared", expect.anything());
  expect(screen.getByRole("radio", { name: "Private" }).getAttribute("aria-checked")).toBe("true");
  expect(
    screen.getByRole("radio", { name: "Shared", description: "Choose a visibility setting." }),
  ).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Shared" }).hasAttribute("data-invalid")).toBe(true);
});

test("required radio group prevents empty form submission", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const inputRef = React.createRef<HTMLInputElement>();
  render(
    <form onSubmit={onSubmit}>
      <RadioGroup label="Visibility" name="visibility" required inputRef={inputRef}>
        {options()}
      </RadioGroup>
      <button type="submit">Save</button>
    </form>,
  );
  const group = screen.getByRole("radiogroup", { name: "Visibility" });
  const legend = group.closest("fieldset")?.firstElementChild;
  const marker = legend?.querySelector("[aria-hidden='true']");
  expect(inputRef.current?.required).toBe(true);
  expect(marker?.textContent).toBe("*");
  expect(marker?.getAttribute("aria-hidden")).toBe("true");
  expect(screen.getByText("Private").closest("label")?.textContent).toBe("Private");
  expect(screen.getByText("Shared").closest("label")?.textContent).toBe("Shared");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test("disabled radio group and hidden legend", () => {
  render(
    <RadioGroup label="Visibility" name="visibility" disabled required visuallyHiddenLabel>
      {options()}
    </RadioGroup>,
  );
  expect(screen.getByRole("radiogroup", { name: "Visibility" })).toBeTruthy();
  const legendText = screen.getByText("Visibility");
  expect(legendText.className).toContain("visually-hidden");
  const marker = legendText.querySelector("[aria-hidden='true']");
  expect(marker?.hasAttribute("data-disabled")).toBe(true);
  expect(marker?.textContent).toBe("*");
  expect(screen.getByRole("radio", { name: "Private" }).hasAttribute("data-disabled")).toBe(true);
});

test("disabled radio item cannot be selected", () => {
  const { container } = render(
    <form>
      <RadioGroup label="Visibility" name="visibility">
        <RadioGroupItem value="private" label="Private" disabled />
        <RadioGroupItem value="shared" label="Shared" />
      </RadioGroup>
    </form>,
  );
  fireEvent.click(screen.getByText("Private"));
  expect(screen.getByRole("radio", { name: "Private" }).hasAttribute("data-disabled")).toBe(true);
  expect(new FormData(container.querySelector("form")!).has("visibility")).toBe(false);
});
