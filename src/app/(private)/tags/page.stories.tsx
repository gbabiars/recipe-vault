import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked } from "storybook/test";
import { requireUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";
import { encodeTagCursor } from "./_lib/tag-pagination";
import TagsPage from "./page";

const listFromRecipes = fn();
const tags = [
  { name: "breakfast", usageCount: 4 },
  { name: "dessert", usageCount: 8 },
  { name: "quick meals", usageCount: 1 },
];
const firstPageTags = Array.from({ length: 25 }, (_, index) => ({
  name: `tag-${String(index + 1).padStart(2, "0")}`,
  usageCount: index + 1,
}));
const secondPageTags = Array.from({ length: 25 }, (_, index) => ({
  name: `tag-${String(index + 26).padStart(2, "0")}`,
  usageCount: index + 26,
}));
const lastPageTags = Array.from({ length: 3 }, (_, index) => ({
  name: `tag-${String(index + 51).padStart(2, "0")}`,
  usageCount: index + 51,
}));

const meta = {
  title: "App/Tags/TagsPage",
  component: TagsPage,
  parameters: { react: { rsc: true } },
  args: { searchParams: Promise.resolve({}) },
  render: (args) => <TagsPage {...args} />,
  beforeEach: () => {
    listFromRecipes.mockReset();
    mocked(requireUser).mockResolvedValue({ id: "storybook-owner" });
    mocked(getTagService).mockResolvedValue({
      listFromRecipes,
    } as unknown as Awaited<ReturnType<typeof getTagService>>);
  },
} satisfies Meta<typeof TagsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnePage: Story = {
  beforeEach: () => {
    listFromRecipes.mockResolvedValue({ tags, hasMore: false });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Tags" })).toBeVisible();
    await expect(await canvas.findByRole("list", { name: "Tags" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "quick meals" })).toHaveAttribute(
      "href",
      "/recipes?tag=quick%20meals",
    );
    await expect(canvas.queryByRole("navigation", { name: "Tag pages" })).not.toBeInTheDocument();
    await expect(listFromRecipes).toHaveBeenCalledWith("storybook-owner", {
      sort: "name_asc",
      limit: 25,
    });
  },
};

export const MultiplePages: Story = {
  beforeEach: () => {
    listFromRecipes.mockResolvedValue({ tags: firstPageTags, hasMore: true });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("navigation", { name: "Tag pages" })).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(25);
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      `/tags?after=${encodeTagCursor(firstPageTags.at(-1)!)}`,
    );
    await expect(canvas.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
  },
};

export const SecondPage: Story = {
  args: {
    searchParams: Promise.resolve({ after: encodeTagCursor(firstPageTags.at(-1)!) }),
  },
  beforeEach: () => {
    listFromRecipes.mockResolvedValue({ tags: secondPageTags, hasMore: true });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("navigation", { name: "Tag pages" })).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(25);
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      `/tags?before=${encodeTagCursor(secondPageTags[0])}`,
    );
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      `/tags?after=${encodeTagCursor(secondPageTags.at(-1)!)}`,
    );
  },
};

export const LastPage: Story = {
  args: {
    searchParams: Promise.resolve({ after: encodeTagCursor(secondPageTags.at(-1)!) }),
  },
  beforeEach: () => {
    listFromRecipes.mockResolvedValue({ tags: lastPageTags, hasMore: false });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("navigation", { name: "Tag pages" })).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      `/tags?before=${encodeTagCursor(lastPageTags[0])}`,
    );
    await expect(canvas.queryByRole("link", { name: "Next" })).not.toBeInTheDocument();
  },
};

export const Error: Story = {
  beforeEach: () => {
    listFromRecipes.mockImplementation(() => {
      throw new globalThis.Error("Inventory unavailable");
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Tags could not be loaded");
    await expect(canvas.getByText("Refresh the page to try again.")).toBeVisible();
  },
};

export const Empty: Story = {
  beforeEach: () => {
    listFromRecipes.mockResolvedValue({ tags: [], hasMore: false });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "No tags yet" })).toBeVisible();
    await expect(
      canvas.getByText("Tag names will appear here when you add them to recipes."),
    ).toBeVisible();
  },
};
