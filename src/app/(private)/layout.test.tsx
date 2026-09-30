import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import PrivateLayout from "./layout";

const { requireUser, bootstrapProvider } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  bootstrapProvider: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@statsig/next", () => ({
  StatsigBootstrapProvider: bootstrapProvider,
  default: { StatsigBootstrapProvider: bootstrapProvider },
}));
vi.mock("@/app/statsig-identity-sync", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/app/app-sidebar-client", () => ({
  AppSidebarClient: () => <div>Sidebar</div>,
}));

beforeEach(() => {
  vi.stubGlobal("process", {
    env: {
      NEXT_PUBLIC_STATSIG_CLIENT_KEY: "client-test-key",
      STATSIG_SERVER_KEY: "secret-test-key",
    },
  });
  requireUser.mockResolvedValue({ id: "user_ada" });
  bootstrapProvider.mockImplementation(({ children }: { children: ReactNode }) => children);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

test("bootstraps the private app for the authenticated ID only", async () => {
  render(await PrivateLayout({ children: <div>Recipes</div> }));

  expect(screen.getByText("Recipes")).toBeInTheDocument();
  expect(bootstrapProvider.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      user: { userID: "user_ada" },
      clientKey: "client-test-key",
      serverKey: "secret-test-key",
      useCookie: false,
      clientOptions: { disableStableID: true },
    }),
  );
});

test("accepts the existing Vercel server key name during migration", async () => {
  vi.stubGlobal("process", {
    env: {
      NEXT_PUBLIC_STATSIG_CLIENT_KEY: "client-test-key",
      STATSG_SECRET_KEY: "secret-existing-key",
    },
  });

  render(await PrivateLayout({ children: <div>Recipes</div> }));
  expect(bootstrapProvider.mock.calls[0][0]).toEqual(
    expect.objectContaining({ serverKey: "secret-existing-key" }),
  );
});
