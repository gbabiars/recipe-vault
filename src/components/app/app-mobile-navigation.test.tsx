import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AppMobileNavigation } from "./app-mobile-navigation";

afterEach(cleanup);

test("mobile account menu closes the drawer when signing out", async () => {
  const onSignOut = vi.fn();
  render(<AppMobileNavigation pathname="/recipes" userName="Ada Lovelace" onSignOut={onSignOut} />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));
  const dialog = screen.getByRole("dialog", { name: "Menu", hidden: true });
  fireEvent.click(screen.getByRole("button", { name: "Ada Lovelace", hidden: true }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out", hidden: true }));

  await waitFor(() => expect(dialog).not.toBeVisible());
  expect(onSignOut).toHaveBeenCalledOnce();
});
