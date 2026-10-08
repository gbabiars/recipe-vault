import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Stack } from "../stack";
import { Skeleton, SkeletonAvatar, SkeletonHeading, SkeletonText } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primitive: Story = {
  render: () => (
    <Stack gap="200">
      <Skeleton width="12rem" height="2rem" />
      <Skeleton width="8rem" height="1rem" radius="150" />
    </Stack>
  ),
};

export const TextAndHeading: Story = {
  render: () => (
    <Stack gap="200">
      <SkeletonText size="small" width="70%" />
      <SkeletonText size="medium" />
      <SkeletonText size="large" width="85%" />
      <SkeletonHeading level={2} width="60%" />
      <SkeletonHeading level={4} />
    </Stack>
  ),
};

export const AvatarSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <SkeletonAvatar size="small" />
      <SkeletonAvatar size="medium" />
      <SkeletonAvatar size="large" />
    </div>
  ),
};
