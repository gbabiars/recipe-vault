import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect } from "storybook/test";
import { RecipeFilters } from "./recipe-filters";

const meta = {
  title: "App/Recipes/RecipeFilters",
  component: RecipeFilters,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ data: [{ name: "beef" }] });
    getRouter().replace.mockClear();
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
    const tag = canvas.getByRole("combobox", { name: "Tags" });
    const searchField = search.closest<HTMLElement>('[data-layout="default"]');
    const tagField = tag.closest<HTMLElement>('[data-layout="default"]');

    if (!searchField || !tagField) throw new Error("Filter field containers were not rendered.");

    await expect(canvas.queryByRole("button", { name: "Filter" })).toBeNull();
    await expect(canvas.queryByText(/Showing up to 25 tags/)).toBeNull();
    await expect(search).toHaveValue("steak");
    await expect(new FormData(tag.closest("form")!).getAll("tag")).toEqual(["beef", "quick"]);
    await expect(
      Math.abs(searchField.getBoundingClientRect().top - tagField.getBoundingClientRect().top),
    ).toBeLessThan(2);
    await expect(
      Math.abs(searchField.getBoundingClientRect().width - tagField.getBoundingClientRect().width),
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
    const tag = canvas.getByRole("combobox", { name: "Tags" });
    await expect(tag.getBoundingClientRect().top).toBeGreaterThan(
      search.getBoundingClientRect().bottom,
    );
  },
};
