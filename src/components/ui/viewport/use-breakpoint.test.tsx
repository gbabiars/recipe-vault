import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { getServerSnapshot } from "./server-snapshot";
import { useBreakpoint } from "./use-breakpoint";

function BreakpointOutput({ breakpoint }: { breakpoint: "sm" | "md" | "lg" | "xl" }) {
  const matches = useBreakpoint(breakpoint);
  return <output data-testid="result">{String(matches)}</output>;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(1280, 720);
});

test("uses a false snapshot during server rendering", () => {
  expect(getServerSnapshot()).toBe(false);
});

test.each([
  ["sm", false],
  ["md", false],
  ["lg", true],
  ["xl", true],
] as const)("subscribes to the %s media query and responds to changes", (breakpoint, initial) => {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: (_: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as () => void);
    },
    removeEventListener: (_: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as () => void);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  }));
  render(<BreakpointOutput breakpoint={breakpoint} />);
  expect(screen.getByTestId("result")).toHaveTextContent(String(initial));

  matches = !initial;
  act(() => listeners.forEach((listener) => listener()));
  expect(screen.getByTestId("result")).toHaveTextContent(String(!initial));
});

test.each([
  ["sm", 639, 640],
  ["md", 767, 768],
  ["lg", 1023, 1024],
  ["xl", 1439, 1440],
] as const)("matches %s at its actual viewport threshold", async (breakpoint, below, at) => {
  await page.viewport(below, 800);
  render(<BreakpointOutput breakpoint={breakpoint} />);
  expect(screen.getByTestId("result")).toHaveTextContent("false");

  await page.viewport(at, 800);
  await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("true"));
});
