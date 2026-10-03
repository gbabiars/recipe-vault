import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { avatarImageFixtureUrl as profileImageUrl } from "../ui/avatar/avatar-image-fixture";
import { AppSidebarClient } from "./app-sidebar-client";
import { ClerkAppSidebarProvider } from "./clerk-app-sidebar-provider";

const clerkState = vi.hoisted(() => ({
  user: null as null | {
    fullName: string | null;
    imageUrl: string;
    username: string | null;
  },
  signOut: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: clerkState.signOut }),
  useUser: () => ({ user: clerkState.user }),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();

  return { ...actual, usePathname: () => "/recipes" };
});

function renderSidebar() {
  return render(
    <ClerkAppSidebarProvider>
      <AppSidebarClient />
    </ClerkAppSidebarProvider>,
  );
}

test("passes Clerk's profile image to desktop and mobile account navigation", () => {
  clerkState.user = {
    fullName: "Ada Lovelace",
    imageUrl: profileImageUrl,
    username: "ada",
  };

  const { container } = renderSidebar();

  expect(container.querySelector("aside img")).toHaveAttribute("src", profileImageUrl);
  fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));

  const dialog = screen.getByRole("dialog", { name: "Menu", hidden: true });
  const accountMenu = within(dialog).getByRole("button", { name: "Ada Lovelace" });

  expect(accountMenu.querySelector("img")).toHaveAttribute("src", profileImageUrl);
});

test("keeps the Account fallback when Clerk has no current user", () => {
  clerkState.user = null;

  const { container } = renderSidebar();

  expect(container.querySelector("aside img")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open menu", hidden: true }));
  expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
});
