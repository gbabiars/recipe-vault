import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ButtonLink } from "../button";
import { Card } from "../card";
import { PageContent, PageHeader, PageLayout } from "./page-layout";

const meta = {
  title: "UI/Page Layout",
  component: PageLayout,
} satisfies Meta<typeof PageLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  render: () => (
    <PageLayout>
      <PageHeader title="Your recipes" />
      <PageContent>
        <Card padding="large">Recipe list</Card>
      </PageContent>
    </PageLayout>
  ),
};

export const WithSlots: Story = {
  render: () => (
    <PageLayout>
      <PageHeader
        title="Tomato soup"
        overline={<a href="#recipes">← All recipes</a>}
        description="Fresh basil soup"
        actions={
          <>
            <ButtonLink render={<a href="#edit" />}>Edit recipe</ButtonLink>
            <a href="#share">Share</a>
          </>
        }
      />
      <PageContent>
        <Card padding="large">Recipe details</Card>
      </PageContent>
    </PageLayout>
  ),
};
