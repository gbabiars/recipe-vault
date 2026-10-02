import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Info, Trash2 } from "lucide-react";

import { Button, IconButton } from "../button";
import { Inline } from "../inline";
import { Tooltip, TooltipProvider } from "./tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  args: {
    trigger: <Button label="Save recipe" />,
    content: "Saves your latest recipe changes.",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const onDelete = fn();

export const ButtonDescription: Story = {
  render: () => (
    <Tooltip
      trigger={<Button label="Save recipe" onClick={() => undefined} />}
      content="Saves your latest recipe changes."
    />
  ),
};

export const ProviderComposition: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip
        trigger={<Button label="Save recipe" />}
        content="Saves your latest recipe changes."
      />
    </TooltipProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "Save recipe" }));
    await expect(within(document.body).findByRole("tooltip")).resolves.toBeVisible();
  },
};

export const SidePlacement: Story = {
  render: () => (
    <Tooltip
      trigger={<Button label="View recipe details" />}
      content="Includes preparation time and serving size."
      side="inline-end"
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("button", { name: "View recipe details" }));
    await expect(within(document.body).findByRole("tooltip")).resolves.toBeVisible();
  },
};

export const IconButtonDescription: Story = {
  render: () => (
    <Tooltip
      trigger={<IconButton icon={Trash2} label="Delete recipe" onClick={onDelete} />}
      content="Permanently removes this recipe."
    />
  ),
  play: async ({ canvas }) => {
    onDelete.mockClear();
    const trigger = canvas.getByRole("button", { name: "Delete recipe" });
    await userEvent.hover(trigger);
    await expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument();
    await expect(within(document.body).findByRole("tooltip")).resolves.toBeVisible();
    await userEvent.click(trigger);
    await expect(onDelete).toHaveBeenCalledTimes(1);
    await expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument();
  },
};

export const RichDescription: Story = {
  render: () => (
    <Tooltip
      trigger={<IconButton icon={Info} label="Shortcut details" />}
      content={
        <>
          Keyboard shortcut: <strong>⌘ + S</strong>
        </>
      }
    />
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Shortcut details" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expect(within(document.body).findByRole("tooltip")).resolves.toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};

export const Disabled: Story = {
  render: () => (
    <Tooltip
      disabled
      trigger={<IconButton icon={Trash2} label="Delete recipe" onClick={() => undefined} />}
      content="Permanently removes this recipe."
    />
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Delete recipe" });
    await userEvent.hover(trigger);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument();
  },
};

export const NearbyTriggers: Story = {
  render: () => (
    <Inline gap="100">
      <Tooltip
        trigger={<IconButton icon={Info} label="First help" />}
        content="First supplemental description."
      />
      <Tooltip
        trigger={<IconButton icon={Trash2} label="Second help" />}
        content="Second supplemental description."
      />
    </Inline>
  ),
  play: async ({ canvas }) => {
    const first = canvas.getByRole("button", { name: "First help" });
    const second = canvas.getByRole("button", { name: "Second help" });
    const secondTooltipId = second.getAttribute("aria-describedby")?.split(" ").at(-1);

    await userEvent.hover(first);
    await within(document.body).findByRole("tooltip");
    await userEvent.unhover(first);
    await userEvent.hover(second);
    const secondTooltip = secondTooltipId ? document.getElementById(secondTooltipId) : null;

    await waitFor(() => expect(secondTooltip).toBeVisible());
  },
};
