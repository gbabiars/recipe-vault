import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  decorators: [
    (Story) => (
      <div style={{ width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
  render: () => (
    <Field name="updates" layout="choice">
      <FieldLabel>
        <Checkbox value="yes" />
        Email me updates
      </FieldLabel>
      <FieldDescription>Occasional recipe news.</FieldDescription>
      <FieldError />
    </Field>
  ),
};

export const Group: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend id="ingredients-legend">Ingredients</FieldsetLegend>
      <CheckboxGroup
        aria-labelledby="ingredients-legend"
        defaultValue={["basil"]}
        allValues={["basil", "parsley"]}
      >
        <Field name="ingredients">
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
          <FieldError />
        </Field>
      </CheckboxGroup>
    </Fieldset>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field name="updates" layout="choice" disabled>
      <FieldLabel>
        <Checkbox defaultChecked />
        Email me updates
      </FieldLabel>
      <FieldDescription>This preference is locked.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend id="invalid-ingredients-legend">Ingredients</FieldsetLegend>
      <CheckboxGroup aria-labelledby="invalid-ingredients-legend">
        <Field name="ingredients" invalid>
          <FieldItem>
            <FieldLabel>
              <Checkbox value="basil" />
              Basil
            </FieldLabel>
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
  ),
};
