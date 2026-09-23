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
  ).toBe("1");

  for (const [name, href] of [
    ["Profile", "/user-profile"],
    ["MCP keys", "/mcp-keys"],
  ]) {
    const heading = screen.getByRole("heading", { level: 2, name });
    expect(heading.getAttribute("data-level")).toBe("5");
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
  }
});
