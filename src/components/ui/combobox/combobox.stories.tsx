import * as React from "react";
import { Leaf, Milk, Wheat } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "../button";
import { ComboboxField, type ComboboxOption } from "./combobox";

const choices: ComboboxOption[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
];
const choicesWithIcons: ComboboxOption[] = [
  { value: "vegetarian", label: "Vegetarian", icon: Leaf },
  { value: "vegan", label: "Vegan", icon: Leaf },
  { value: "gluten-free", label: "Gluten-free", icon: Wheat },
  { value: "dairy-free", label: "Dairy-free", icon: Milk },
];
const search = async (query: string, signal: AbortSignal) => {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 120);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
  return choices.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
};
const searchWithIcons = async (query: string, signal: AbortSignal) => {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 120);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
  return choicesWithIcons.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
};
const createWithIcon = (query: string) => ({
  value: query.trim().toLowerCase(),
  label: query.trim(),
  icon: Leaf,
});

const meta = {
  title: "UI/ComboboxField",
  component: ComboboxField,
  args: { name: "tags", label: "Tags", placeholder: "Search labels" },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const SingleLocal: Story = {
  args: { options: choices },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Tags" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegetarian" }));
    await expect(canvas.getByRole("combobox", { name: "Tags" })).toHaveValue("Vegetarian");
  },
};
export const SingleLocalCreatable: Story = {
  args: { options: choicesWithIcons, createOption: createWithIcon },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "low sodium");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “low sodium”/ }),
    );
    await expect(canvas.getByRole("combobox", { name: "Tags" })).toHaveValue("low sodium");
  },
};
export const SingleAsync: Story = {
  args: { loadOptions: search },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "vegan");
    await expect(await within(document.body).findByRole("listbox", { name: "Tags" })).toBeVisible();
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegan" }));
    await expect(canvas.getByRole("combobox", { name: "Tags" })).toHaveValue("Vegan");
  },
};
export const LocalOptionsWithIcons: Story = {
  args: { options: choicesWithIcons },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Tags" }));
    const vegan = await within(document.body).findByRole("option", { name: "Vegan" });
    const icon = vegan.querySelector("svg");
    await expect(vegan.firstElementChild).toBe(icon);
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveAttribute("focusable", "false");
    const options = within(document.body).getAllByRole("option");
    for (const option of options) {
      await expect(option.firstElementChild).toBe(option.querySelector("svg"));
      await expect(option.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  },
};
export const AsyncOptionsWithIcons: Story = {
  args: { loadOptions: searchWithIcons },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "vegan");
    const vegan = await within(document.body).findByRole("option", { name: "Vegan" });
    await expect(vegan.firstElementChild).toBe(vegan.querySelector("svg"));
    await expect(vegan.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  },
};
export const CreatedOptionsWithIcons: Story = {
  args: { multiple: true, options: [], createOption: createWithIcon },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.type(input, "paleo");
    const createItem = await within(document.body).findByRole("option", {
      name: /Create “paleo”/,
    });
    await expect(createItem.firstElementChild).toBe(createItem.querySelector("svg"));
    await userEvent.click(createItem);
    const chip = canvas.getByRole("button", { name: "Remove paleo" });
    await expect(chip).toBeVisible();
    await userEvent.click(input);
    const created = await within(document.body).findByRole("option", { name: "paleo" });
    await expect(created.firstElementChild).toBe(created.querySelector("svg"));
    await expect(created.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(chip.querySelectorAll("svg")).toHaveLength(1);
  },
};
export const BrowseThenSearch: Story = {
  render: () => {
    function Example() {
      const [submitted, setSubmitted] = React.useState<string | null>(null);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(new FormData(event.currentTarget).get("tag")?.toString() ?? "");
          }}
        >
          <ComboboxField
            name="tag"
            label="Tag"
            loadOptions={search}
            loadOnEmpty
            helpText="Browse or search tags."
          />
          <Button label="Filter" type="submit" />
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
    await expect(
      await within(document.body).findByRole("option", { name: "Vegetarian" }),
    ).toBeVisible();
    await userEvent.type(input, "vegan");
    await expect(await within(document.body).findByRole("option", { name: "Vegan" })).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(input).toHaveValue("Vegan");
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }));
    await expect(canvas.getByRole("status", { name: "Submitted tag" })).toHaveTextContent("vegan");
  },
};
export const SingleAsyncCreatable: Story = {
  args: { loadOptions: searchWithIcons, createOption: createWithIcon },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "paleo");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “paleo”/ }),
    );
    await expect(canvas.getByRole("combobox", { name: "Tags" })).toHaveValue("paleo");
  },
};
export const MultipleLocal: Story = {
  args: { multiple: true, options: choices },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Tags" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegetarian" }));
    await expect(canvas.getByRole("button", { name: "Remove Vegetarian" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Remove Vegetarian" }));
    await expect(
      canvas.queryByRole("button", { name: "Remove Vegetarian" }),
    ).not.toBeInTheDocument();
  },
};
export const MultipleLocalCreatable: Story = {
  args: { multiple: true, options: choicesWithIcons, createOption: createWithIcon },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "paleo");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “paleo”/ }),
    );
    await expect(canvas.getByRole("button", { name: "Remove paleo" })).toBeVisible();
  },
};
export const MultipleAsync: Story = {
  args: { multiple: true, loadOptions: search, loadOnEmpty: true },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(await within(document.body).findByRole("listbox", { name: "Tags" })).toBeVisible();
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegetarian" }));
    await userEvent.type(input, "gluten");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Gluten-free" }),
    );
    await expect(input).toHaveValue("");
    await userEvent.click(canvas.getByRole("button", { name: "Remove Vegetarian" }));
    await userEvent.click(input);
    await expect(await within(document.body).findByRole("option", { name: "Vegan" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Remove Gluten-free" })).toBeVisible();
  },
};
export const MultipleAsyncCreatable: Story = {
  args: { multiple: true, loadOptions: searchWithIcons, createOption: createWithIcon },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.type(input, "paleo");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “paleo”/ }),
    );
    await userEvent.type(input, "vegan");
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegan" }));
    await userEvent.click(canvas.getByRole("button", { name: "Remove paleo" }));
    await expect(canvas.getByRole("button", { name: "Remove Vegan" })).toBeVisible();
  },
};
export const Disabled: Story = {
  args: {
    options: choices,
    disabled: true,
    required: true,
    defaultValue: "vegan",
    helpText: "Tag selection is locked.",
  },
};
export const Required: Story = {
  render: (args) => (
    <form>
      <ComboboxField {...args} name="tags" label="Tags" options={choices} required />
      <Button label="Save" type="submit" />
    </form>
  ),
};
export const InitialSelection: Story = {
  args: { multiple: true, options: choices, defaultValue: ["vegan", "vegetarian"] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Tags" }));
    await expect(
      await within(document.body).findByRole("option", { name: "Vegan" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};
export const EmptyResults: Story = {
  args: { loadOptions: async () => [] },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "unknown");
    await expect(await within(document.body).findByText("No matches.")).toBeVisible();
  },
};
export const Loading: Story = {
  args: { loadOptions: () => new Promise(() => {}) },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "vegan");
    await expect(await within(document.body).findByText("Searching…")).toBeVisible();
  },
};
export const SearchError: Story = {
  args: {
    loadOptions: async () => {
      throw new Error("Search failed");
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "vegan");
    await expect(await within(document.body).findByText("Search failed. Try again.")).toBeVisible();
  },
};
export const InvalidCreation: Story = {
  args: { options: choicesWithIcons, createOption: () => null },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "unknown");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “unknown”/ }),
    );
    await expect(canvas.getByText("Could not create this option.")).toBeVisible();
  },
};
export const ExternalError: Story = { args: { options: choices, error: "Choose a valid label." } };

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [value, setValue] = React.useState<string[]>(["vegan"]);
      return (
        <ComboboxField
          name="tags"
          label="Tags"
          multiple
          options={choices}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    return <Example />;
  },
};

export const FormValues: Story = {
  render: () => {
    function Example() {
      const [submitted, setSubmitted] = React.useState<string[]>([]);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(new FormData(event.currentTarget).getAll("tags").map(String));
          }}
        >
          <ComboboxField name="tags" label="Tags" multiple options={choices} />
          <Button label="Save" type="submit" />
          <output aria-label="Submitted tags">{submitted.join(", ")}</output>
        </form>
      );
    }
    return <Example />;
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await userEvent.click(input);
    await userEvent.click(await within(document.body).findByRole("option", { name: "Vegan" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("status", { name: "Submitted tags" })).toHaveTextContent(
      "vegetarian, vegan",
    );
  },
};

export const DuplicateCreation: Story = {
  args: {
    multiple: true,
    options: choicesWithIcons,
    createOption: createWithIcon,
    defaultValue: ["vegan"],
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "VEGAN");
    await expect(
      within(document.body).queryByRole("option", { name: /Create/ }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Remove Vegan" })).toBeVisible();
  },
};

export const StaleResults: Story = {
  args: {
    multiple: true,
    loadOptions: async (query: string) => {
      await new Promise((resolve) => window.setTimeout(resolve, query === "veg" ? 450 : 20));
      return query === "veg" ? [choices[0]] : [choices[1]];
    },
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.type(input, "veg");
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    await userEvent.type(input, "an");
    await expect(await within(document.body).findByRole("option", { name: "Vegan" })).toBeVisible();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    await expect(
      within(document.body).queryByRole("option", { name: "Vegetarian" }),
    ).not.toBeInTheDocument();
  },
};
