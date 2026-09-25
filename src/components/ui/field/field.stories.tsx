import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field as BaseField } from "@base-ui/react/field";

import { Field, FieldDescription, FieldError, FieldLabel, Fieldset, FieldsetLegend } from "./field";

const meta = {
  title: "UI/Field",
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecipeTitle: Story = {
  render: () => (
    <Field name="title">
      <FieldLabel>Recipe title</FieldLabel>
      <BaseField.Control required />
      <FieldDescription>Use a name you will recognize in your vault.</FieldDescription>
      <FieldError match="valueMissing">Enter a recipe title.</FieldError>
    </Field>
  ),
};

export const GroupedFields: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Recipe details</FieldsetLegend>
      <Field name="source">
        <FieldLabel>Source</FieldLabel>
        <BaseField.Control />
      </Field>
    </Fieldset>
  ),
};
