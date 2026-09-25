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
      <BreadcrumbsItem>
        <a href="#recipes">Recipes</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem current>Tomato soup</BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const TrailingSeparator: Story = {
  render: () => (
    <Breadcrumbs trailingSeparator>
      <BreadcrumbsItem>
        <a href="#recipes">Recipes</a>
      </BreadcrumbsItem>
      <BreadcrumbsItem>
        <a href="#soups">Soups</a>
      </BreadcrumbsItem>
    </Breadcrumbs>
  ),
};

export const WrappingLongTitle: Story = {
  render: () => (
    <div style={{ maxWidth: 260 }}>
      <Breadcrumbs>
        <BreadcrumbsItem>
          <a href="#recipes">Recipes</a>
        </BreadcrumbsItem>
        <BreadcrumbsItem>
          <a href="#soups">Soups</a>
        </BreadcrumbsItem>
        <BreadcrumbsItem current>
          Slow-roasted tomato and basil soup for a winter evening
        </BreadcrumbsItem>
      </Breadcrumbs>
    </div>
  ),
};
