import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button, type ButtonSize, type ButtonVariant } from "./button";

const variants: ButtonVariant[] = ["default", "primary", "subtle", "danger"];
const sizes: ButtonSize[] = ["small", "medium", "large"];

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Create recipe",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Create recipe" });

    expect(button.getAttribute("type")).toBe("button");
    await userEvent.click(button);
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Submit: Story = {
  render: () => (
    <form>
      <Button type="submit">Save recipe</Button>
    </form>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Save recipe" });

    expect(button.getAttribute("type")).toBe("submit");
  },
};

export const NativeLink: Story = {
  render: () => <Button href="/recipes/new">Create recipe</Button>,
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Create recipe" });

    expect(link.getAttribute("href")).toBe("/recipes/new");
    expect(canvas.queryByRole("button", { name: "Create recipe" })).toBeNull();
    expect(link.hasAttribute("type")).toBe(false);
    expect(link.hasAttribute("disabled")).toBe(false);
  },
};

export const NextLink: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <Button
      href="/recipes/new"
      onClick={args.onClick}
      render={(anchorProps) => (
        <Link
          {...anchorProps}
          prefetch={false}
          onClick={(event) => {
            anchorProps.onClick?.(event);
            event.preventDefault();
          }}
        />
      )}
    >
      Create recipe
    </Button>
  ),
  play: async ({ args, canvas }) => {
    const link = canvas.getByRole("link", { name: "Create recipe" });

    expect(link.getAttribute("href")).toBe("/recipes/new");
    expect(link.classList.length).toBeGreaterThan(0);
    expect(canvas.queryByRole("button", { name: "Create recipe" })).toBeNull();
    await userEvent.click(link);
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const NextLinkElement: Story = {
  render: () => (
    <Button href="/recipes/new" render={<Link href="/recipes/new" prefetch={false} />}>
      Create recipe
    </Button>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Create recipe" });

    expect(link.getAttribute("href")).toBe("/recipes/new");
    expect(link.classList.length).toBeGreaterThan(0);
    expect(canvas.queryByRole("button", { name: "Create recipe" })).toBeNull();
  },
};

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
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Create recipe" });

    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(args.onClick).not.toHaveBeenCalled();
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
