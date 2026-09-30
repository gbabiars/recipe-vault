import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

const { signOut, useUser } = vi.hoisted(() => ({ signOut: vi.fn(), useUser: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut }), useUser }));
vi.mock("next/navigation", () => ({ default: {}, usePathname: () => "/settings" }));

let AppSidebarClient: typeof import("./app-sidebar-client").AppSidebarClient;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  ({ AppSidebarClient } = await import("./app-sidebar-client"));
});

beforeEach(() => {
  useUser.mockReturnValue({
    isLoaded: true,
    user: { fullName: "Ada Lovelace", username: "ada" },
  });
});

afterAll(() => vi.unstubAllGlobals());

afterEach(() => {
  cleanup();
  signOut.mockClear();
  useUser.mockReset();
});

test("client sidebar shows the Clerk user and signs out to sign-in", () => {
  render(<AppSidebarClient />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  const accountMenu = screen.getByRole("button", { name: "Ada Lovelace" });
  expect(accountMenu).toBeInTheDocument();
  fireEvent.click(accountMenu);
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

  expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
});

test("client sidebar falls back to the username when the full name is blank", () => {
  useUser.mockReturnValue({
    isLoaded: true,
    user: { fullName: "   ", username: "  ada  " },
  });

  render(<AppSidebarClient />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(screen.getByRole("button", { name: "ada" })).toBeInTheDocument();
});

test("client sidebar uses Account while Clerk is loading without a user name", () => {
  useUser.mockReturnValue({ isLoaded: false, user: null });

  render(<AppSidebarClient />);

  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
});
