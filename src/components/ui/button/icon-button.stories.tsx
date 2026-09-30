import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookOpen, Trash2 } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";

import { IconButton } from "./icon-button";
import type { ButtonSize, ButtonVariant } from "./button";

const variants: ButtonVariant[] = ["default", "primary", "subtle", "danger"];
const sizes: ButtonSize[] = ["small", "medium", "large"];
const dimensions: Record<ButtonSize, number> = {
  small: 32,
  medium: 36,
  large: 40,
};

const meta = {
  title: "UI/IconButton",
  component: IconButton,
  args: {
    icon: Trash2,
    label: "Delete recipe",
    onClick: fn(),
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Delete recipe" });
    const icon = button.querySelector("svg");

    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("data-variant")).toBe("default");
    expect(button.getAttribute("data-size")).toBe("medium");

    if (icon === null) {
      throw new Error("Expected the icon button to render its icon");
    }

    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("focusable")).toBe("false");

    await userEvent.click(button);

    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Link: Story = {
  render: () => <IconButton icon={BookOpen} label="Open recipe" href="/recipes/tomato-soup" />,
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Open recipe" });
    const icon = link.querySelector("svg");

    expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
    expect(link.hasAttribute("type")).toBe(false);
    expect(link.hasAttribute("disabled")).toBe(false);

    if (icon === null) {
      throw new Error("Expected the icon link to render its icon");
    }

    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("focusable")).toBe("false");
  },
};

export const VariantsAndSizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {sizes.map((size) => (
            <IconButton
              key={size}
              icon={Trash2}
              label={`${variant} ${size}`}
              variant={variant}
              size={size}
            />
          ))}
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const variant of variants) {
      for (const size of sizes) {
        const button = canvas.getByRole("button", { name: `${variant} ${size}` });
        const { width, height } = button.getBoundingClientRect();
        const icon = button.querySelector("svg");

        expect(button.getAttribute("data-variant")).toBe(variant);
        expect(button.getAttribute("data-size")).toBe(size);
        expect(width).toBe(dimensions[size]);
        expect(height).toBe(dimensions[size]);

        if (icon === null) {
          throw new Error(`Expected ${variant} ${size} to render its icon`);
        }

        const iconRect = icon.getBoundingClientRect();
        const iconStyle = getComputedStyle(icon);

        expect(iconStyle.width).toBe("16px");
        expect(iconStyle.height).toBe("16px");
        expect(iconRect.width).toBe(16);
        expect(iconRect.height).toBe(16);
      }
    }
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Delete recipe" });

    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(args.onClick).not.toHaveBeenCalled();
  },
};
