import Link from "next/link";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ButtonLink } from "./button-link";

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

export const NextLink: Story = {
  args: {
    href: undefined,
    render: <Link href="/recipes/new" />,
  },
};
