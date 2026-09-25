import Link from "next/link";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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
