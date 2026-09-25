import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { McpKeyManager } from "./mcp-key-manager";

const createMcpKeyAction = vi.fn();
vi.mock("./actions", () => ({
  createMcpKeyAction: (...args: unknown[]) => createMcpKeyAction(...args),
}));

afterEach(() => {
  cleanup();
  createMcpKeyAction.mockReset();
});

test("submits the key name and choices, then resets the name after creation", async () => {
  createMcpKeyAction.mockResolvedValue({ name: "Kitchen client", secret: "test-secret" });
  const { container } = render(<McpKeyManager />);
  expect(screen.getByRole("radiogroup", { name: "Permissions" })).toBeTruthy();
  expect(screen.getByRole("radiogroup", { name: "Expiration" })).toBeTruthy();
  expect(new FormData(container.querySelector("form")!).get("access")).toBe("read");
  expect(new FormData(container.querySelector("form")!).get("expiration")).toBe("90");
  const name = screen.getByRole("textbox", { name: "Key name" }) as HTMLInputElement;
  fireEvent.change(name, { target: { value: "Kitchen client" } });
  fireEvent.click(screen.getByRole("radio", { name: "Read and save recipes" }));
  fireEvent.click(screen.getByRole("radio", { name: "30 days" }));
  fireEvent.click(screen.getByRole("button", { name: "Create MCP key" }));

  await waitFor(() => expect(createMcpKeyAction).toHaveBeenCalled());
  expect(Object.fromEntries(createMcpKeyAction.mock.calls[0][1] as FormData)).toMatchObject({
    name: "Kitchen client",
    access: "write",
    expiration: "30",
  });
  await waitFor(() => expect(name.value).toBe(""));
  expect(screen.getByRole("textbox", { name: "New MCP API key" })).toBeTruthy();
});
