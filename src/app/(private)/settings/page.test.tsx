import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

let SettingsPage: typeof import("./page").default;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  SettingsPage = (await import("./page")).default;
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

test("renders settings headings and destination links", () => {
  render(<SettingsPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Settings" }).getAttribute("data-level"),
  ).toBe("2");

  const profileHeading = screen.getByRole("heading", { level: 2, name: "Profile" });
  expect(profileHeading.getAttribute("data-level")).toBe("5");
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/user-profile");
  expect(screen.queryByRole("link", { name: /MCP keys/i })).toBeNull();
});
