import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { TextInput } from "./text-input";

const meta = {
  title: "UI/TextInput",
  component: TextInput,
  args: { label: "Recipe title", name: "title" },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Uncontrolled: Story = {
  args: { defaultValue: "Tomato soup", helpText: "Give this recipe a memorable name." },
};

export const Search: Story = {
  args: { label: "Search recipes", name: "q", type: "search", placeholder: "Find a recipe" },
};

export const Controlled: Story = {
  render: (args) => {
    function Example() {
      const [value, setValue] = React.useState("Tomato soup");
      return <TextInput {...args} value={value} onValueChange={setValue} />;
    }
    return <Example />;
  },
};

export const Required: Story = {
  render: (args) => (
    <form>
      <TextInput {...args} required />
      <Button type="submit">Save</Button>
    </form>
  ),
};

export const ExternalError: Story = {
  args: { error: "This title is already in use." },
};

export const HiddenLabel: Story = {
  args: { label: "Search recipes", visuallyHiddenLabel: true, type: "search" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Tomato soup" },
};
