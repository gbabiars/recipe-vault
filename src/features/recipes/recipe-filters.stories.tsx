import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RecipeFilters } from "./recipe-filters";

const meta = {
  title: "Recipes/RecipeFilters",
  component: RecipeFilters,
  parameters: { layout: "padded" },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ data: [{ name: "beef" }] });
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof RecipeFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  args: { q: "steak", tag: "beef" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const search = canvas.getByRole("searchbox", { name: "Search title" });
    const tag = canvas.getByRole("combobox", { name: "Tag" });
    const button = canvas.getByRole("button", { name: "Filter" });
    await expect(search).toHaveValue("steak");
    await expect(tag).toHaveValue("beef");
    await expect(
      Math.abs(search.getBoundingClientRect().top - tag.getBoundingClientRect().top),
    ).toBeLessThan(2);
    await expect(
      Math.abs(search.getBoundingClientRect().top - button.getBoundingClientRect().top),
    ).toBeLessThan(2);
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 340 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const search = canvas.getByRole("searchbox", { name: "Search title" });
    const tag = canvas.getByRole("combobox", { name: "Tag" });
    const button = canvas.getByRole("button", { name: "Filter" });
    await expect(tag.getBoundingClientRect().top).toBeGreaterThan(
      search.getBoundingClientRect().bottom,
    );
    await expect(button.getBoundingClientRect().top).toBeGreaterThan(
      tag.getBoundingClientRect().bottom,
    );
  },
};
