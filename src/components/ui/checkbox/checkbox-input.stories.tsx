import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckboxInput } from "./checkbox";

const meta = {
  title: "UI/CheckboxInput",
  component: CheckboxInput,
  args: { label: "Email me updates", name: "updates" },
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
  args: { value: "yes", helpText: "Occasional recipe news." },
};

export const Disabled: Story = {
  args: { defaultChecked: true, disabled: true, helpText: "This preference is locked." },
};
