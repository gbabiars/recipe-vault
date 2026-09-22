import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut }) }));
vi.mock("next/navigation", () => ({ default: {}, usePathname: () => "/settings" }));

let AppSidebarClient: typeof import("./app-sidebar-client").AppSidebarClient;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  ({ AppSidebarClient } = await import("./app-sidebar-client"));
});

afterAll(() => vi.unstubAllGlobals());

afterEach(() => {
  cleanup();
  signOut.mockClear();
});

test("client sidebar signs out through Clerk and redirects to sign-in", () => {
  render(<AppSidebarClient />);

  expect(screen.getByRole("link", { name: "Settings" }).getAttribute("aria-current")).toBe("page");
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
});
