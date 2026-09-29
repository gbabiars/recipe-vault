import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { TagFilter } from "./tag-filter";

const tags = ["dinner", "soup", "weeknight"];

const meta = {
  title: "Recipes/TagFilter",
  component: TagFilter,
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

export const BrowseAndFilter: Story = {
  render: () => {
    function Example() {
      const [submitted, setSubmitted] = React.useState("");
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(new FormData(event.currentTarget).getAll("tag").join(", "));
          }}
        >
          <TagFilter />
          <Button type="submit">Filter</Button>
          <output aria-label="Submitted tag">{submitted}</output>
        </form>
      );
    }
    return <Example />;
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tag" });
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
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }));
    await expect(canvas.getByRole("status", { name: "Submitted tag" })).toHaveTextContent(
      "weeknight",
    );
  },
};

export const OldUrlTag: Story = {
  args: { tag: "renamed" },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tag" });
    await expect(canvas.getByText("renamed")).toBeVisible();
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(await within(document.body).findByRole("option", { name: "soup" })).toBeVisible();
    await expect(canvas.getByText("renamed")).toBeVisible();
  },
};
