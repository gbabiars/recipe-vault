import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { TagFilter } from "./tag-filter";

const tags = ["dinner", "soup", "weeknight"];

const meta = {
  title: "App/Recipes/TagFilter",
  component: TagFilter,
  args: { value: [], onValueChange: () => {} },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const search = new URL(String(input)).searchParams.get("search")?.toLowerCase() ?? "";
      return Response.json({
        data: tags.filter((name) => name.includes(search)).map((name) => ({ name })),
      });
    };
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof TagFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BrowseAndSelect: Story = {
  render: () => {
    function Example() {
      const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
      return (
        <>
          <TagFilter value={selectedTags} onValueChange={setSelectedTags} />
          <output aria-label="Selected tags">{selectedTags.join(", ")}</output>
        </>
      );
    }
    return <Example />;
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.click(await within(document.body).findByRole("option", { name: "soup" }));
    await userEvent.click(input);
    await expect(
      await within(document.body).findByRole("option", { name: "weeknight" }),
    ).toBeVisible();
    await userEvent.click(await within(document.body).findByRole("option", { name: "weeknight" }));
    await userEvent.click(canvas.getByRole("button", { name: "Remove soup" }));
    await userEvent.click(input);
    await expect(await within(document.body).findByRole("option", { name: "soup" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("status", { name: "Selected tags" })).toHaveTextContent(
      "weeknight",
    );
  },
};

export const OldUrlTag: Story = {
  render: () => {
    function Example() {
      const [selectedTags, setSelectedTags] = React.useState(["renamed"]);
      return <TagFilter value={selectedTags} onValueChange={setSelectedTags} />;
    }
    return <Example />;
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await expect(canvas.getByText("renamed")).toBeVisible();
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(await within(document.body).findByRole("option", { name: "soup" })).toBeVisible();
    await expect(canvas.getByText("renamed")).toBeVisible();
  },
};
