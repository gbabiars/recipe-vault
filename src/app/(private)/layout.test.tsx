import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import PrivateLayout from "./layout";

const { requireUser, createLaunchDarklyUserConfig, getCookie } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createLaunchDarklyUserConfig: vi.fn(() => null),
  getCookie: vi.fn(() => undefined as { value: string } | undefined),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/launchdarkly", () => ({ createLaunchDarklyUserConfig }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("@/components/app/app-sidebar-client", () => ({
  AppSidebarClient: ({ initialCollapsed }: { initialCollapsed: boolean }) => (
    <div data-collapsed={initialCollapsed}>Sidebar</div>
  ),
}));
vi.mock("@/components/app/clerk-app-sidebar-provider", () => ({
  ClerkAppSidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  requireUser.mockResolvedValue({ id: "user_ada" });
});

afterEach(() => {
  vi.resetAllMocks();
});

test("requires an authenticated user before rendering the private app", async () => {
  render(await PrivateLayout({ children: <div>Recipes</div> }));

  expect(screen.getByText("Recipes")).toBeInTheDocument();
  expect(screen.getByText("Sidebar")).toBeInTheDocument();
  expect(requireUser).toHaveBeenCalledOnce();
  expect(createLaunchDarklyUserConfig).toHaveBeenCalledWith("user_ada");
});

test("seeds the sidebar as collapsed from the current account cookie", async () => {
  getCookie.mockReturnValue({ value: "user_ada:collapsed" });

  render(await PrivateLayout({ children: <div>Recipes</div> }));

  expect(screen.getByText("Sidebar")).toHaveAttribute("data-collapsed", "true");
});

test("does not apply another account's sidebar preference", async () => {
  getCookie.mockReturnValue({ value: "user_grace:collapsed" });

  render(await PrivateLayout({ children: <div>Recipes</div> }));

  expect(screen.getByText("Sidebar")).toHaveAttribute("data-collapsed", "false");
});
