import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { avatarImageFixtureUrl as profileImageFixtureUrl } from "../ui/avatar/avatar-image-fixture";
import { AppMobileNavigation } from "./app-mobile-navigation";

const meta = {
  title: "app/Navigation/Mobile",
  component: AppMobileNavigation,
  args: { pathname: "/recipes", userName: "Ada Lovelace", onSignOut: () => {} },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppMobileNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recipes: Story = {
  play: async ({ canvas }) => {
    await expect(
      within(document.body).queryByRole("dialog", { name: "Menu" }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(within(dialog).getByRole("link", { name: "Recipes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};

export const Profile: Story = {
  args: { pathname: "/user-profile", userImageUrl: profileImageFixtureUrl },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await expect(within(dialog).queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    const trigger = within(dialog).getByRole("button", { name: "Ada Lovelace" });
    await expect(trigger.querySelector("img")).toHaveAttribute("src", profileImageFixtureUrl);
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const menu = await within(document.body).findByRole("menu");
    await expect(
      Math.abs(menu.getBoundingClientRect().width - trigger.getBoundingClientRect().width),
    ).toBeLessThan(1);
    const settings = within(menu).getByRole("menuitem", { name: "Settings" });
    const signOut = within(menu).getByRole("menuitem", { name: "Sign out" });
    await expect(settings).toHaveAttribute("href", "/settings");
    await expect(settings).not.toHaveAttribute("aria-current");
    await userEvent.keyboard("{ArrowDown}");
    const highlightedAfterFirstMove = [settings, signOut].find((item) =>
      item.hasAttribute("data-highlighted"),
    );
    await expect(highlightedAfterFirstMove).toBeDefined();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect([settings, signOut].find((item) => item.hasAttribute("data-highlighted"))).not.toBe(
        highlightedAfterFirstMove,
      );
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument());
    await expect(dialog).toBeVisible();

    await userEvent.click(trigger);
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Settings" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};

export const Tags: Story = {
  args: { pathname: "/tags" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await expect(within(dialog).getByRole("link", { name: "Tags" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

export const SignOut: Story = {
  args: { onSignOut: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Ada Lovelace" }));
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};
