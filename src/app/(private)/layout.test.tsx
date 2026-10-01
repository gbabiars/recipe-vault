import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import PrivateLayout from "./layout";

const { requireUser } = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/components/app/app-sidebar-client", () => ({
  AppSidebarClient: () => <div>Sidebar</div>,
}));

beforeEach(() => {
  requireUser.mockResolvedValue({ id: "user_ada" });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("requires an authenticated user before rendering the private app", async () => {
  render(await PrivateLayout({ children: <div>Recipes</div> }));

  expect(screen.getByText("Recipes")).toBeInTheDocument();
  expect(screen.getByText("Sidebar")).toBeInTheDocument();
  expect(requireUser).toHaveBeenCalledOnce();
});
