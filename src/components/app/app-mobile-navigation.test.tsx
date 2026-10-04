import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AppMobileNavigation } from "./app-mobile-navigation";

test("mobile account menu closes the drawer when signing out", async () => {
  const onSignOut = vi.fn();
  render(<AppMobileNavigation pathname="/recipes" userName="Ada Lovelace" onSignOut={onSignOut} />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));
  const dialog = screen.getByRole("dialog", { name: "Menu", hidden: true });
  expect(screen.queryByRole("link", { name: "Recipe Vault", hidden: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ada Lovelace", hidden: true }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out", hidden: true }));

  await waitFor(() => expect(dialog).not.toBeVisible());
  expect(onSignOut).toHaveBeenCalledOnce();
});

test("mobile navigation marks the tags destination as current", () => {
  render(<AppMobileNavigation pathname="/tags" userName="Ada Lovelace" onSignOut={() => {}} />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));
  const tags = screen.getByRole("link", { name: "Tags", hidden: true });

  expect(tags).toHaveAttribute("href", "/tags");
  expect(tags).toHaveAttribute("aria-current", "page");
  const icon = tags.querySelector("svg");
  expect(tags.firstElementChild).toBe(icon);
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(icon).toHaveAttribute("focusable", "false");
});
