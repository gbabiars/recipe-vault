import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AppSidebarStateProvider, type AppSidebarUser } from "./app-sidebar-context";
import { AppSidebarClient } from "./app-sidebar-client";

function renderSidebar(user: AppSidebarUser | null) {
  const onSignOut = vi.fn();

  const rendered = render(
    <AppSidebarStateProvider value={{ pathname: "/settings", user, onSignOut }}>
      <AppSidebarClient />
    </AppSidebarStateProvider>,
  );

  return { ...rendered, onSignOut };
}

test("client sidebar shows the account name and calls the provided sign-out action", () => {
  const { onSignOut } = renderSidebar({ fullName: "Ada Lovelace", username: "ada" });

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  const accountMenu = screen.getByRole("button", { name: "Ada Lovelace" });
  expect(accountMenu).toBeInTheDocument();
  fireEvent.click(accountMenu);
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

  expect(onSignOut).toHaveBeenCalledOnce();
});

test("client sidebar falls back to the username when the full name is blank", () => {
  renderSidebar({ fullName: "   ", username: "  ada  " });

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(screen.getByRole("button", { name: "ada" })).toBeInTheDocument();
});

test("client sidebar uses Account when no user is available", () => {
  const { container } = renderSidebar(null);

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  expect(container.querySelector("aside img")).toBeNull();
});
