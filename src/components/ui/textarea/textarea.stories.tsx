import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { label: "Recipe notes", name: "recipe-notes", placeholder: "Enter recipe notes" },
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

export const Default: Story = {
  args: { defaultValue: "Add fresh basil before serving.", helpText: "Keep useful tips here." },
};

export const Controlled: Story = {
  render: (args) => {
    function Example() {
      const [value, setValue] = React.useState("Add fresh basil before serving.");
      return <Textarea {...args} value={value} onValueChange={setValue} />;
    }
    return <Example />;
  },
};

export const Required: Story = {
  render: (args) => (
    <form>
      <Textarea {...args} required />
      <Button type="submit">Save</Button>
    </form>
  ),
};

export const ExternalError: Story = {
  args: { error: "Add at least one note." },
};

export const HiddenLabel: Story = {
  args: { visuallyHiddenLabel: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Add fresh basil before serving." },
};
