import Link from "next/link";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { BookOpen } from "lucide-react";

import { ButtonLink } from "./button-link";
import type { ButtonSize, ButtonVariant } from "./button";

const variants: ButtonVariant[] = ["default", "primary", "subtle", "danger"];
const sizes: ButtonSize[] = ["small", "medium", "large"];

const meta = {
  title: "UI/ButtonLink",
  component: ButtonLink,
  args: {
    children: "Create recipe",
    href: "/recipes/new",
  },
} satisfies Meta<typeof ButtonLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NativeAnchor: Story = {};

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

export const NextLink: Story = {
  args: {
    href: undefined,
    render: <Link href="/recipes/new" />,
  },
};

export const Width: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "20rem" }}>
      <ButtonLink href="/recipes/new">Fit content</ButtonLink>
      <ButtonLink href="/recipes/new" fullWidth>
        Fill parent
      </ButtonLink>
    </div>
  ),
};

export const VariantsAndSizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {sizes.map((size) => (
            <ButtonLink key={size} href="/recipes/new" variant={variant} size={size}>
              {variant} {size}
            </ButtonLink>
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
        <ButtonLink key={size} href="/recipes" icon={BookOpen} size={size}>
          Recipes
        </ButtonLink>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link", { name: "Recipes" });

    expect(links).toHaveLength(sizes.length);

    for (const link of links) {
      const icon = link.querySelector("svg");

      if (icon === null) {
        throw new Error("Expected each link to render a leading icon");
      }

      expect(icon).toBe(link.firstElementChild);
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("focusable")).toBe("false");
      expect(getComputedStyle(link).fontSize).toBe("16px");
      expect(getComputedStyle(link).lineHeight).toBe("16px");
      expect(getComputedStyle(icon).width).toBe("16px");
      expect(getComputedStyle(icon).height).toBe("16px");
      expect(getComputedStyle(icon).marginInlineEnd).toBe("8px");
    }
  },
};
