import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
} from "./field";
import { Radio, RadioGroup } from "./radio";

afterEach(cleanup);

test("radio group labels options and submits the selected value", () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const radioInputRef = React.createRef<HTMLInputElement>();
  const radioRef = React.createRef<HTMLElement>();
  const { container } = render(
    <form>
      <Fieldset>
        <FieldsetLegend>Visibility</FieldsetLegend>
        <RadioGroup name="visibility" defaultValue="private" inputRef={inputRef}>
          <Field name="visibility">
            <FieldItem>
              <FieldLabel>
                <Radio value="private" ref={radioRef} inputRef={radioInputRef} />
                Private
              </FieldLabel>
              <FieldDescription>Only you can see it.</FieldDescription>
            </FieldItem>
            <FieldItem>
              <FieldLabel>
                <Radio value="shared" />
                Shared
              </FieldLabel>
            </FieldItem>
            <FieldError />
          </Field>
        </RadioGroup>
      </Fieldset>
    </form>,
  );
  expect(screen.getByRole("radiogroup", { name: "Visibility" })).toBeTruthy();
  expect(container.querySelector("fieldset")?.children[1].getAttribute("role")).toBe("radiogroup");
  expect(
    screen
      .getByRole("radio", { name: "Private", description: "Only you can see it." })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
  expect(radioInputRef.current).toBeInstanceOf(HTMLInputElement);
  expect(radioRef.current).toBe(screen.getByRole("radio", { name: "Private" }));
  fireEvent.click(screen.getByText("Shared"));
  expect(new FormData(container.querySelector("form")!).get("visibility")).toBe("shared");
});

test("space selects a radio option", () => {
  render(
    <Fieldset>
      <FieldsetLegend>Size</FieldsetLegend>
      <RadioGroup name="size" defaultValue="small">
        <Field name="size">
          <FieldItem>
            <FieldLabel>
              <Radio value="small" />
              Small
            </FieldLabel>
          </FieldItem>
          <FieldItem>
            <FieldLabel>
              <Radio value="large" />
              Large
            </FieldLabel>
          </FieldItem>
        </Field>
      </RadioGroup>
    </Fieldset>,
  );
  const large = screen.getByRole("radio", { name: "Large" });
  large.focus();
  fireEvent.keyDown(large, { key: " " });
  fireEvent.keyUp(large, { key: " " });
  expect(screen.getByRole("radio", { name: "Large" }).getAttribute("aria-checked")).toBe("true");
});

test("controlled radio group reports changes and honors disabled and invalid states", () => {
  const onValueChange = vi.fn();
  render(
    <Fieldset>
      <FieldsetLegend>Size</FieldsetLegend>
      <RadioGroup name="size" value="small" onValueChange={onValueChange}>
        <Field name="size" invalid>
          <FieldItem>
            <FieldLabel>
              <Radio value="small" />
              Small
            </FieldLabel>
          </FieldItem>
          <FieldItem disabled>
            <FieldLabel>
              <Radio value="medium" />
              Medium
            </FieldLabel>
          </FieldItem>
          <FieldItem>
            <FieldLabel>
              <Radio value="large" />
              Large
            </FieldLabel>
          </FieldItem>
          <FieldError match={true}>Choose a size.</FieldError>
        </Field>
      </RadioGroup>
    </Fieldset>,
  );
  expect(screen.getByRole("radio", { name: "Medium" }).hasAttribute("data-disabled")).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Large" }));
  expect(onValueChange).toHaveBeenCalledWith("large", expect.anything());
  expect(screen.getByRole("radio", { name: "Small" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("radio", { name: "Large" }).hasAttribute("data-invalid")).toBe(true);
  expect(screen.getByText("Choose a size.")).toBeTruthy();
});

test("required radio group prevents empty form submission", () => {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <Fieldset>
        <FieldsetLegend>Size</FieldsetLegend>
        <RadioGroup name="size" required>
          <Field name="size">
            <FieldItem>
              <FieldLabel>
                <Radio value="small" />
                Small
              </FieldLabel>
            </FieldItem>
          </Field>
        </RadioGroup>
      </Fieldset>
      <button type="submit">Save</button>
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSubmit).not.toHaveBeenCalled();
});
