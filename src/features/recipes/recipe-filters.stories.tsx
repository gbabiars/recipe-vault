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
  args: { q: "steak", tag: ["beef", "quick"] },
  decorators: [
    (Story) => (
      <div style={{ width: 900 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const search = canvas.getByRole("searchbox", { name: "Search title" });
    const tag = canvas.getByRole("combobox", { name: "Tag" });
    const button = canvas.getByRole("button", { name: "Filter" });
    const searchField = search.closest<HTMLElement>('[data-layout="default"]');
    const tagField = tag.closest<HTMLElement>('[data-layout="default"]');

    if (!searchField || !tagField) throw new Error("Filter field containers were not rendered.");

    await expect(search).toHaveValue("steak");
    await expect(new FormData(tag.closest("form")!).getAll("tag")).toEqual(["beef", "quick"]);
    await expect(
      Math.abs(searchField.getBoundingClientRect().top - tagField.getBoundingClientRect().top),
    ).toBeLessThan(2);
    await expect(
      Math.abs(search.getBoundingClientRect().top - button.getBoundingClientRect().top),
    ).toBeLessThan(2);
    const widthDifference = Math.abs(
      searchField.getBoundingClientRect().width - tagField.getBoundingClientRect().width,
    );
    await expect(
      widthDifference / Math.max(searchField.getBoundingClientRect().width, 1),
    ).toBeLessThan(0.02);
    await expect(searchField.getBoundingClientRect().width).toBeGreaterThan(
      button.getBoundingClientRect().width,
    );
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
