import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./button";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Inline } from "./inline";
import { Stack } from "./stack";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { placeholder: "Enter a description" },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: (args) => (
    <Field>
      <Textarea aria-label="Description" {...args} />
    </Field>
  ),
};

export const Labeled: Story = {
  render: () => (
    <Field name="recipe-notes">
      <FieldLabel>Recipe notes</FieldLabel>
      <Textarea placeholder="e.g. Add fresh basil before serving" />
      <FieldDescription>Keep any tips you want to remember.</FieldDescription>
      <FieldError />
    </Field>
  ),
};

export const Required: Story = {
  render: () => (
    <Stack as="form" gap="200">
      <Field name="recipe-notes">
        <FieldLabel>Recipe notes</FieldLabel>
        <Textarea required placeholder="Enter recipe notes" />
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
    <Field disabled name="recipe-notes">
      <FieldLabel>Recipe notes</FieldLabel>
      <Textarea defaultValue="Add fresh basil before serving." />
      <FieldDescription>These notes cannot be edited.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field invalid name="recipe-notes">
      <FieldLabel>Recipe notes</FieldLabel>
      <Textarea defaultValue="" />
      <FieldError match={true}>Add at least one note.</FieldError>
    </Field>
  ),
};
