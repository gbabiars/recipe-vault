import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Link } from "./link";

const meta = {
  title: "UI/Link",
  component: Link,
  args: { href: "/recipes", children: "Browse recipes" },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NewTab: Story = {
  args: { href: "/help", target: "_blank", children: "Help (opens in a new tab)" },
};

export const ButtonAction: Story = {
  args: {
    href: undefined,
    render: <button />,
    onClick: () => {},
    children: "Open help",
  },
};

export const InheritedFont: Story = {
  render: () => (
    <p style={{ font: "var(--font-text-large)" }}>
      Read the <Link href="/guide">recipe guide</Link>.
    </p>
  ),
};
