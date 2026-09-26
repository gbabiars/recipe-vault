import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { AppMobileNavigation } from "./app-mobile-navigation";

const meta = {
  title: "app/Navigation/Mobile",
  component: AppMobileNavigation,
  args: { pathname: "/recipes", onSignOut: () => {} },
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
  args: { pathname: "/user-profile" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await expect(within(dialog).getByRole("link", { name: "Settings" })).not.toHaveAttribute(
      "aria-current",
    );
    await userEvent.click(within(dialog).getByRole("link", { name: "Settings" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};

export const SignOut: Story = {
  args: { onSignOut: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open menu" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Menu" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};
