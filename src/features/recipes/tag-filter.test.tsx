import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, expect, test, vi } from "vitest";
import { TagFilter, loadOwnedTags } from "./tag-filter";

const tagNames = ["dinner", "soup", "weeknight"];
const fetchMock = vi.fn(async (input: URL) => {
  const search = input.searchParams.get("search")?.toLowerCase() ?? "";
  return Response.json({
    data: tagNames.filter((name) => name.includes(search)).map((name) => ({ name })),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

test("loads initial tags, searches, and reloads when cleared", async () => {
  vi.stubGlobal("fetch", fetchMock);
  render(<TagFilter />);
  const input = screen.getByRole("combobox", { name: "Tag" });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowDown}");
  expect(await screen.findByRole("option", { name: "dinner" })).toBeTruthy();
  expect(fetchMock.mock.calls[0][0].search).toBe("");
  await userEvent.type(input, "sou");
  await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[0].search).toBe("?search=sou"));
  expect(await screen.findByRole("option", { name: "soup" })).toBeTruthy();
  await userEvent.clear(input);
  await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[0].search).toBe(""));
  expect(await screen.findByRole("option", { name: "weeknight" })).toBeTruthy();
});

test("keeps an old URL tag visible and submits its canonical value until replaced", async () => {
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(
    <form>
      <TagFilter tag="renamed" />
    </form>,
  );
  const input = screen.getByRole("combobox", { name: "Tag" });
  expect(input).toHaveValue("renamed");
  expect(new FormData(container.querySelector("form")!).get("tag")).toBe("renamed");
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "soup" }));
  expect(input).toHaveValue("soup");
  expect(new FormData(container.querySelector("form")!).get("tag")).toBe("soup");
});

test("typing without selecting does not submit a tag", async () => {
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(
    <form>
      <TagFilter />
    </form>,
  );
  const input = screen.getByRole("combobox", { name: "Tag" });
  fireEvent.change(input, { target: { value: "invented" } });
  expect(new FormData(container.querySelector("form")!).get("tag")).not.toBe("invented");
});

test("tag loader rejects a failed API response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 500 })),
  );
  await expect(loadOwnedTags("soup", new AbortController().signal)).rejects.toThrow(
    "Could not load tags.",
  );
});
