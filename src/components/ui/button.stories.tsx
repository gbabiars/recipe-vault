import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button, type ButtonSize, type ButtonVariant } from "./button";

const variants: ButtonVariant[] = ["default", "primary", "subtle", "danger"];
const sizes: ButtonSize[] = ["small", "medium", "large"];

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Create recipe",
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Subtle: Story = {
  args: { variant: "subtle" },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Delete recipe",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const VariantsAndSizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {sizes.map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} {size}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
