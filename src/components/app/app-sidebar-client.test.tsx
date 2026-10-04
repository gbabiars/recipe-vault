import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AppSidebarStateProvider, type AppSidebarUser } from "./app-sidebar-context";
import { AppSidebarClient } from "./app-sidebar-client";

const { setAppSidebarCollapsed } = vi.hoisted(() => ({
  setAppSidebarCollapsed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./app-sidebar-actions", () => ({ setAppSidebarCollapsed }));

function renderSidebar(user: AppSidebarUser | null, initialCollapsed = false) {
  const onSignOut = vi.fn();

  const rendered = render(
    <AppSidebarStateProvider value={{ pathname: "/settings", user, onSignOut }}>
      <AppSidebarClient initialCollapsed={initialCollapsed} />
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

test("client sidebar toggles between expanded and collapsed navigation", async () => {
  setAppSidebarCollapsed.mockClear();
  const { container } = renderSidebar({ fullName: "Ada Lovelace" });

  const sidebar = container.querySelector("aside");
  expect(sidebar).toHaveAttribute("data-collapsed", "false");
  fireEvent.click(screen.getByRole("button", { name: "Collapse navigation", hidden: true }));
  expect(sidebar).toHaveAttribute("data-collapsed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Expand navigation", hidden: true }));
  expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await waitFor(() => expect(setAppSidebarCollapsed).toHaveBeenNthCalledWith(2, false));
});

test("client sidebar starts collapsed from its server-provided preference", () => {
  const { container } = renderSidebar({ fullName: "Ada Lovelace" }, true);

  expect(container.querySelector("aside")).toHaveAttribute("data-collapsed", "true");
});

test("client sidebar restores its previous state when saving the preference fails", async () => {
  setAppSidebarCollapsed.mockRejectedValueOnce(new Error("cookie write failed"));
  const { container } = renderSidebar({ fullName: "Ada Lovelace" });
  const sidebar = container.querySelector("aside");

  fireEvent.click(screen.getByRole("button", { name: "Collapse navigation", hidden: true }));
  expect(sidebar).toHaveAttribute("data-collapsed", "true");

  await waitFor(() => expect(sidebar).toHaveAttribute("data-collapsed", "false"));
});
