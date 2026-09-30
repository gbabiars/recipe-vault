import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Plus } from "lucide-react";

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

export const Width: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "20rem" }}>
      <Button>Fit content</Button>
      <Button fullWidth>Fill parent</Button>
    </div>
  ),
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

export const IconAcrossSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      {sizes.map((size) => (
        <Button key={size} icon={Plus} size={size}>
          Create recipe
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole("button", { name: "Create recipe" });

    expect(buttons).toHaveLength(sizes.length);

    for (const button of buttons) {
      const icon = button.querySelector("svg");

      if (icon === null) {
        throw new Error("Expected each button to render a leading icon");
      }

      expect(icon).toBe(button.firstElementChild);
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("focusable")).toBe("false");
      expect(getComputedStyle(button).fontSize).toBe("16px");
      expect(getComputedStyle(button).lineHeight).toBe("16px");
      expect(getComputedStyle(icon).width).toBe("16px");
      expect(getComputedStyle(icon).height).toBe("16px");
      expect(getComputedStyle(icon).marginInlineEnd).toBe("8px");
    }
  },
};
