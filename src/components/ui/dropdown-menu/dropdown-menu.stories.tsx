import * as React from "react";
import { Archive, BookOpen, Copy, Pencil } from "lucide-react";
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
        <DropdownMenuItem icon={Pencil} onClick={onEdit}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem icon={Copy} onClick={() => undefined}>
          Duplicate
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onEdit.mockClear();
    const trigger = canvas.getByRole("button", { name: "Recipe actions" });
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    const edit = await within(document.body).findByRole("menuitem", { name: "Edit" });
    const icon = edit.querySelector("svg");
    await expect(edit.firstElementChild).toBe(icon);
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveAttribute("focusable", "false");
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
        <DropdownMenuItem icon={Pencil} onClick={() => undefined}>
          Edit recipe
        </DropdownMenuItem>
        <DropdownMenuLinkItem icon={BookOpen} href="#recipe-details">
          View details
        </DropdownMenuLinkItem>
        <DropdownMenuItem icon={Copy} onClick={() => undefined}>
          Duplicate recipe
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Recipe actions" }));
    const edit = await within(document.body).findByRole("menuitem", { name: "Edit recipe" });
    const link = await within(document.body).findByRole("menuitem", { name: "View details" });
    const duplicate = await within(document.body).findByRole("menuitem", {
      name: "Duplicate recipe",
    });
    await expect(edit.firstElementChild).toBe(edit.querySelector("svg"));
    await expect(edit.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(link.firstElementChild).toBe(link.querySelector("svg"));
    await expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(duplicate.firstElementChild).toBe(duplicate.querySelector("svg"));
    await expect(duplicate.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
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
        <DropdownMenuItem icon={Pencil} onClick={() => undefined}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled icon={Archive} onClick={onArchive}>
          Archive
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    onArchive.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Recipe actions" }));
    const edit = await within(document.body).findByRole("menuitem", { name: "Edit" });
    const archive = await within(document.body).findByRole("menuitem", { name: "Archive" });
    await expect(edit.firstElementChild).toBe(edit.querySelector("svg"));
    await expect(edit.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await expect(archive).toHaveAttribute("aria-disabled", "true");
    await expect(archive.firstElementChild).toBe(archive.querySelector("svg"));
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
