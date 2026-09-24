import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckboxGroup, CheckboxGroupItem } from "./checkbox";

const meta = {
  title: "UI/CheckboxGroup",
  component: CheckboxGroup,
  args: { label: "Ingredients", name: "ingredients" },
  decorators: [
    (Story) => (
      <div style={{ width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  render: (args) => (
    <CheckboxGroup {...args}>
      <CheckboxGroupItem value="basil" label="Basil" helpText="Fresh leaves." defaultChecked />
      <CheckboxGroupItem value="parsley" label="Parsley" />
    </CheckboxGroup>
  ),
};

export const Invalid: Story = {
  args: { error: "Choose an ingredient." },
  render: (args) => (
    <CheckboxGroup {...args}>
      <CheckboxGroupItem value="basil" label="Basil" />
      <CheckboxGroupItem value="parsley" label="Parsley" />
    </CheckboxGroup>
  ),
};
