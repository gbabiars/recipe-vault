import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Breadcrumbs, BreadcrumbsItem } from "./breadcrumbs";

const meta = {
  title: "UI/Breadcrumbs",
  component: Breadcrumbs,
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortTrail: Story = {
  render: () => (
    <Breadcrumbs>
      <BreadcrumbsItem href="#recipes">Recipes</BreadcrumbsItem>
      <BreadcrumbsItem current>Tomato soup</BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const TrailingSeparator: Story = {
  render: () => (
    <Breadcrumbs trailingSeparator>
      <BreadcrumbsItem href="#recipes">Recipes</BreadcrumbsItem>
      <BreadcrumbsItem href="#soups">Soups</BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const WrappingLongTitle: Story = {
  render: () => (
    <div style={{ maxWidth: 260 }}>
      <Breadcrumbs>
        <BreadcrumbsItem href="#recipes">Recipes</BreadcrumbsItem>
        <BreadcrumbsItem href="#soups">Soups</BreadcrumbsItem>
        <BreadcrumbsItem current>
          Slow-roasted tomato and basil soup for a winter evening
        </BreadcrumbsItem>
      </Breadcrumbs>
    </div>
  ),
};
