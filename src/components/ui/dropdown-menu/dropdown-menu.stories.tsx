import * as React from "react";
import Link from "next/link";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const onEdit = fn();
const onArchive = fn();

export const ActionOnly: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Recipe actions" />} />
      <DropdownMenuPopup>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => undefined}>Duplicate</DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onEdit.mockClear();
    const trigger = canvas.getByRole("button", { name: "Recipe actions" });
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    const edit = await within(document.body).findByRole("menuitem", { name: "Edit" });
    await userEvent.click(edit);
    await expect(onEdit).toHaveBeenCalledTimes(1);
    await expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument();
  },
};

export const MixedActionsAndLinks: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Recipe actions" />} />
      <DropdownMenuPopup>
        <DropdownMenuItem onClick={() => undefined}>Edit recipe</DropdownMenuItem>
        <DropdownMenuLinkItem render={<Link href="#recipe-details" />}>
          View details
        </DropdownMenuLinkItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Recipe actions" }));
    const link = await within(document.body).findByRole("menuitem", { name: "View details" });
    await expect(link).toHaveAttribute("href", "#recipe-details");
    await userEvent.click(link);
    await expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument();
  },
};

export const DisabledAction: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Recipe actions" />} />
      <DropdownMenuPopup>
        <DropdownMenuItem onClick={() => undefined}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled onClick={onArchive}>
          Archive
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onArchive.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Recipe actions" }));
    const archive = await within(document.body).findByRole("menuitem", { name: "Archive" });
    await expect(archive).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(archive);
    await expect(onArchive).not.toHaveBeenCalled();
    await expect(within(document.body).getByRole("menu")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(document.querySelector("[data-base-ui-focus-guard]")).not.toBeInTheDocument(),
    );
  },
};

export const ControlledOpenState: Story = {
  render: () => {
    function Example() {
      const [open, setOpen] = React.useState(false);

      return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger render={<Button label="Recipe actions" />} />
          <DropdownMenuPopup>
            <DropdownMenuItem onClick={() => undefined}>Edit</DropdownMenuItem>
          </DropdownMenuPopup>
        </DropdownMenu>
      );
    }

    return <Example />;
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Recipe actions" }));
    await expect(
      await within(document.body).findByRole("menuitem", { name: "Edit" }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector("[data-base-ui-focus-guard]")).not.toBeInTheDocument(),
    );
  },
};

export const KeyboardNavigation: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Recipe actions" />} />
      <DropdownMenuPopup>
        <DropdownMenuItem onClick={() => undefined}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => undefined}>Duplicate</DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Recipe actions" });
    await userEvent.click(trigger);
    const edit = await within(document.body).findByRole("menuitem", { name: "Edit" });
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(edit).toHaveAttribute("data-highlighted", ""));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(within(document.body).getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute(
        "data-highlighted",
        "",
      ),
    );
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector("[data-base-ui-focus-guard]")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
