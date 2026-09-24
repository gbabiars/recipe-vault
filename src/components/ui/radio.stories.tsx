import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RadioGroup, RadioGroupItem } from "./radio";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  decorators: [
    (Story) => (
      <div style={{ width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  args: { label: "Visibility" },
  render: () => (
    <RadioGroup label="Visibility" name="visibility" defaultValue="private" required>
      <RadioGroupItem value="private" label="Private" helpText="Only you can see it." />
      <RadioGroupItem value="shared" label="Shared" />
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  args: { label: "Visibility" },
  render: () => (
    <RadioGroup label="Visibility" name="visibility" defaultValue="private" disabled>
      <RadioGroupItem value="private" label="Private" />
      <RadioGroupItem value="shared" label="Shared" />
    </RadioGroup>
  ),
};

export const Invalid: Story = {
  args: { label: "Visibility" },
  render: () => (
    <RadioGroup label="Visibility" name="visibility" error="Choose a visibility setting.">
      <RadioGroupItem value="private" label="Private" />
      <RadioGroupItem value="shared" label="Shared" />
    </RadioGroup>
  ),
};
