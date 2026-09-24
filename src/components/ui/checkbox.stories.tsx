import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckboxGroup, CheckboxGroupItem, CheckboxInput } from "./checkbox";

const meta = {
  title: "UI/Checkbox",
  component: CheckboxInput,
  decorators: [
    (Story) => (
      <div style={{ width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckboxInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
  args: { label: "Email me updates" },
  render: () => (
    <CheckboxInput
      name="updates"
      value="yes"
      label="Email me updates"
      helpText="Occasional recipe news."
    />
  ),
};

export const Group: Story = {
  args: { label: "Email me updates" },
  render: () => (
    <CheckboxGroup
      label="Ingredients"
      name="ingredients"
      defaultValue={["basil"]}
      allValues={["basil", "parsley"]}
    >
      <CheckboxGroupItem parent label="All ingredients" />
      <CheckboxGroupItem value="basil" label="Basil" helpText="Fresh leaves." />
      <CheckboxGroupItem value="parsley" label="Parsley" />
    </CheckboxGroup>
  ),
};

export const Disabled: Story = {
  args: { label: "Email me updates" },
  render: () => (
    <CheckboxInput
      label="Email me updates"
      name="updates"
      defaultChecked
      disabled
      helpText="This preference is locked."
    />
  ),
};

export const Invalid: Story = {
  args: { label: "Email me updates" },
  render: () => (
    <CheckboxGroup label="Ingredients" name="ingredients" error="Choose an ingredient.">
      <CheckboxGroupItem value="basil" label="Basil" />
      <CheckboxGroupItem value="parsley" label="Parsley" />
    </CheckboxGroup>
  ),
};
