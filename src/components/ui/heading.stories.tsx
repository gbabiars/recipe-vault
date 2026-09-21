import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Heading } from "./heading";

const meta = {
  title: "UI/Heading",
  component: Heading,
  args: {
    children: "Recipe Vault",
  },
  argTypes: {
    as: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6", "p"],
    },
    level: {
      control: "select",
      options: [1, 2, 3, 4, 5, 6],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Level1: Story = {
  args: {
    level: 1,
    children: "Page heading",
  },
};

export const Level2: Story = {
  args: {
    level: 2,
    children: "Section heading",
  },
};

export const Level3: Story = {
  args: {
    level: 3,
    children: "Subsection heading",
  },
};

export const Level4: Story = {
  args: {
    level: 4,
    children: "Supporting heading",
  },
};

export const Level5: Story = {
  args: {
    level: 5,
    children: "Card heading",
  },
};

export const Level6: Story = {
  args: {
    level: 6,
    children: "Small heading",
  },
};

export const AsOverride: Story = {
  args: {
    level: 3,
    as: "h2",
    children: "Level 3 styling rendered as h2",
  },
};

export const SixLevelComparison: Story = {
  render: () => (
    <div>
      <Heading level={1}>Level 1 heading</Heading>
      <Heading level={2}>Level 2 heading</Heading>
      <Heading level={3}>Level 3 heading</Heading>
      <Heading level={4}>Level 4 heading</Heading>
      <Heading level={5}>Level 5 heading</Heading>
      <Heading level={6}>Level 6 heading</Heading>
    </div>
  ),
};
