import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
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
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

function ControlledTagFilter({ initialTags = [] }: { initialTags?: string[] }) {
  const [tags, setTags] = useState(initialTags);
  return (
    <form>
      <TagFilter value={tags} onValueChange={setTags} />
    </form>
  );
}

test("loads initial tags, searches, and reloads when cleared", async () => {
  vi.stubGlobal("fetch", fetchMock);
  render(<TagFilter value={[]} onValueChange={vi.fn()} />);
  const input = screen.getByRole("combobox", { name: "Tags" });
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

test("keeps an old URL tag visible and submits its value until replaced", async () => {
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(<ControlledTagFilter initialTags={["renamed"]} />);
  const input = screen.getByRole("combobox", { name: "Tags" });
  expect(screen.getByText("renamed")).toBeTruthy();
  expect(new FormData(container.querySelector("form")!).get("tag")).toBe("renamed");
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "soup" }));
  expect(new FormData(container.querySelector("form")!).getAll("tag")).toEqual(["renamed", "soup"]);
});

test("selects and submits multiple tags", async () => {
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(<ControlledTagFilter />);
  const input = screen.getByRole("combobox", { name: "Tags" });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "dinner" }));
  await userEvent.click(input);
  expect(await screen.findByRole("option", { name: "soup" })).toBeTruthy();
  await userEvent.click(await screen.findByRole("option", { name: "soup" }));

  expect(new FormData(container.querySelector("form")!).getAll("tag")).toEqual(["dinner", "soup"]);
  await userEvent.click(screen.getByRole("button", { name: "Remove dinner" }));
  await userEvent.click(input);
  expect(await screen.findByRole("option", { name: "dinner" })).toBeTruthy();
  expect(new FormData(container.querySelector("form")!).getAll("tag")).toEqual(["soup"]);
});

test("typing without selecting does not submit a tag", async () => {
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(<ControlledTagFilter />);
  const input = screen.getByRole("combobox", { name: "Tags" });
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
