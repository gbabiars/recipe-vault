import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./button";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { Stack } from "./stack";
import { Inline } from "./inline";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { placeholder: "Enter a value" },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const Labeled: Story = {
  render: () => (
    <Field name="recipe-title">
      <FieldLabel>Recipe title</FieldLabel>
      <Input placeholder="e.g. Tomato soup" />
      <FieldDescription>Give this recipe a name you will recognize.</FieldDescription>
      <FieldError />
    </Field>
  ),
};

export const Required: Story = {
  render: () => (
    <Stack as="form" gap="200">
      <Field name="recipe-title">
        <FieldLabel>Recipe title</FieldLabel>
        <Input required placeholder="Enter a recipe title" />
        <FieldError />
      </Field>
      <Inline>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </Inline>
    </Stack>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field disabled name="recipe-title">
      <FieldLabel>Recipe title</FieldLabel>
      <Input defaultValue="Tomato soup" />
      <FieldDescription>This field cannot be edited.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field invalid name="recipe-title">
      <FieldLabel>Recipe title</FieldLabel>
      <Input defaultValue="" />
      <FieldError match={true}>This title is already in use.</FieldError>
    </Field>
  ),
};
