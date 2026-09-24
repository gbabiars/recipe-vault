import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Checkbox, CheckboxGroup } from "./checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
} from "./field";

afterEach(cleanup);

test("labels a standalone checkbox and submits its value", () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const ref = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <Field name="updates" layout="choice">
        <FieldLabel>
          <Checkbox value="yes" inputRef={inputRef} ref={ref} />
          Email me updates
        </FieldLabel>
        <FieldDescription>Occasional recipe news.</FieldDescription>
        <FieldError />
      </Field>
    </form>,
  );

  const checkbox = screen.getByRole("checkbox", {
    name: "Email me updates",
    description: "Occasional recipe news.",
  });
  expect(ref.current).toBe(checkbox);
  expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
  fireEvent.click(screen.getByText("Email me updates"));
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
  expect(new FormData(container.querySelector("form")!).get("updates")).toBe("yes");
  fireEvent.click(checkbox);
  expect(new FormData(container.querySelector("form")!).has("updates")).toBe(false);
});

test("controlled, read-only, disabled, and invalid standalone states", () => {
  const onCheckedChange = vi.fn();
  render(
    <>
      <Field name="controlled" layout="choice" invalid>
        <FieldLabel>
          <Checkbox checked onCheckedChange={onCheckedChange} />
          Controlled
        </FieldLabel>
        <FieldError match={true}>Check this setting.</FieldError>
      </Field>
      <Field name="locked" layout="choice">
        <FieldLabel>
          <Checkbox readOnly defaultChecked />
          Locked
        </FieldLabel>
      </Field>
      <Field name="disabled" layout="choice" disabled>
        <FieldLabel>
          <Checkbox />
          Disabled
        </FieldLabel>
      </Field>
      <Field name="mixed" layout="choice">
        <FieldLabel>
          <Checkbox indeterminate />
          Mixed
        </FieldLabel>
      </Field>
    </>,
  );
  const controlled = screen.getByRole("checkbox", { name: "Controlled" });
  fireEvent.click(controlled);
  expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  expect(controlled.getAttribute("aria-checked")).toBe("true");
  expect(controlled.hasAttribute("data-invalid")).toBe(true);
  expect(screen.getByText("Check this setting.")).toBeTruthy();
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
});

test("checkbox group has a legend, repeated form values, and select-all mixed state", () => {
  const onValueChange = vi.fn();
  const { container } = render(
    <form>
      <Fieldset>
        <FieldsetLegend id="ingredients-legend">Ingredients</FieldsetLegend>
        <CheckboxGroup
          aria-labelledby="ingredients-legend"
          defaultValue={["basil"]}
          allValues={["basil", "parsley"]}
          onValueChange={onValueChange}
        >
          <Field name="ingredients" invalid>
            <FieldItem>
              <FieldLabel>
                <Checkbox parent />
                All ingredients
              </FieldLabel>
            </FieldItem>
            <FieldItem>
              <FieldLabel>
                <Checkbox value="basil" />
                Basil
              </FieldLabel>
              <FieldDescription>Fresh leaves.</FieldDescription>
            </FieldItem>
            <FieldItem>
              <FieldLabel>
                <Checkbox value="parsley" />
                Parsley
              </FieldLabel>
            </FieldItem>
            <FieldError match={true}>Choose an ingredient.</FieldError>
          </Field>
        </CheckboxGroup>
      </Fieldset>
    </form>,
  );
  expect(screen.getAllByRole("group", { name: "Ingredients" })).toHaveLength(2);
  expect(container.querySelector("fieldset")?.children[1].getAttribute("role")).toBe("group");
  expect(
    screen.getByRole("checkbox", { name: "Basil" }).getAttribute("aria-describedby"),
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

test("space toggles a checkbox from the keyboard", () => {
  render(
    <Field name="updates" layout="choice">
      <FieldLabel>
        <Checkbox />
        Updates
      </FieldLabel>
    </Field>,
  );
  const checkbox = screen.getByRole("checkbox", { name: "Updates" });
  checkbox.focus();
  fireEvent.keyDown(checkbox, { key: " " });
  fireEvent.keyUp(checkbox, { key: " " });
  expect(checkbox.getAttribute("aria-checked")).toBe("true");
});
