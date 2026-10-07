import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RecipeFilters } from "./recipe-filters";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

const tagNames = ["dinner", "soup", "weeknight"];
const fetchMock = vi.fn(async (input: URL) => {
  const search = input.searchParams.get("search")?.toLowerCase() ?? "";
  return Response.json({
    data: tagNames.filter((name) => name.includes(search)).map((name) => ({ name })),
  });
});

beforeEach(() => {
  replaceMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

test("debounces title search until typing pauses", async () => {
  render(<RecipeFilters />);
  const search = screen.getByRole("searchbox", { name: "Search title" });

  fireEvent.change(search, { target: { value: "soup" } });
  expect(replaceMock).not.toHaveBeenCalled();
  await new Promise((resolve) => setTimeout(resolve, 180));

  fireEvent.change(search, { target: { value: "soup stew" } });
  await new Promise((resolve) => setTimeout(resolve, 180));
  expect(replaceMock).not.toHaveBeenCalled();

  await waitFor(() =>
    expect(replaceMock).toHaveBeenLastCalledWith("/recipes?q=soup+stew", { scroll: false }),
  );
  expect(replaceMock).toHaveBeenCalledTimes(1);
});

test("Enter applies search immediately and prevents form navigation", async () => {
  render(<RecipeFilters q="old" />);
  const search = screen.getByRole("searchbox", { name: "Search title" });
  const form = search.closest("form")!;
  const initialSearch = window.location.search;

  fireEvent.change(search, { target: { value: "latest" } });
  await userEvent.click(search);
  await userEvent.keyboard("{Enter}");

  expect(replaceMock).toHaveBeenCalledWith("/recipes?q=latest", { scroll: false });
  expect(form.getAttribute("action")).toBeNull();
  expect(window.location.search).toBe(initialSearch);
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(replaceMock).toHaveBeenCalledTimes(1);
});

test("keeps search focus when route filter props update", async () => {
  const { rerender } = render(<RecipeFilters />);
  const search = screen.getByRole("searchbox", { name: "Search title" });
  await userEvent.click(search);
  fireEvent.change(search, { target: { value: "soup " } });

  await waitFor(() =>
    expect(replaceMock).toHaveBeenLastCalledWith("/recipes?q=soup", { scroll: false }),
  );

  rerender(<RecipeFilters q="soup" />);

  expect(screen.getByRole("searchbox", { name: "Search title" })).toBe(search);
  expect(document.activeElement).toBe(search);
  expect(search).toHaveValue("soup ");
});

test("keeps tag input focus when route filter props update", async () => {
  const { rerender } = render(<RecipeFilters />);
  const tagInput = screen.getByRole("combobox", { name: "Tags" });
  await userEvent.click(tagInput);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "dinner" }));

  expect(replaceMock).toHaveBeenCalledWith("/recipes?tag=dinner", { scroll: false });

  rerender(<RecipeFilters tag="dinner" />);

  expect(screen.getByRole("combobox", { name: "Tags" })).toBe(tagInput);
  expect(document.activeElement).toBe(tagInput);
});

test("stale route props do not overwrite a newer search edit", async () => {
  const { rerender } = render(<RecipeFilters q="old" />);
  const tagInput = screen.getByRole("combobox", { name: "Tags" });
  await userEvent.click(tagInput);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "dinner" }));
  await userEvent.keyboard("{Escape}");

  const search = screen.getByRole("searchbox", { name: "Search title" });
  fireEvent.change(search, { target: { value: "new" } });
  rerender(<RecipeFilters q="old" tag="dinner" />);

  expect(search).toHaveValue("new");
  await waitFor(() =>
    expect(replaceMock).toHaveBeenLastCalledWith("/recipes?q=new&tag=dinner", {
      scroll: false,
    }),
  );
});

test("external route changes sync controls and cancel pending search", async () => {
  const { rerender } = render(<RecipeFilters />);
  const search = screen.getByRole("searchbox", { name: "Search title" });
  fireEvent.change(search, { target: { value: "pending" } });

  rerender(<RecipeFilters q="external" tag="dinner" />);

  expect(search).toHaveValue("external");
  expect(screen.getByRole("button", { name: "Remove dinner" })).toBeVisible();
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(replaceMock).not.toHaveBeenCalled();
});

test("tag changes immediately apply pending search text and cancel its timer", async () => {
  render(<RecipeFilters />);
  const search = screen.getByRole("searchbox", { name: "Search title" });
  const tagInput = screen.getByRole("combobox", { name: "Tags" });

  fireEvent.change(search, { target: { value: "tomato soup" } });
  expect(replaceMock).not.toHaveBeenCalled();
  await userEvent.click(tagInput);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.click(await screen.findByRole("option", { name: "dinner" }));

  expect(replaceMock).toHaveBeenCalledWith("/recipes?q=tomato+soup&tag=dinner", {
    scroll: false,
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
  expect(replaceMock).toHaveBeenCalledTimes(1);
});

test("removing tags preserves search and removes empty query values", async () => {
  render(<RecipeFilters q="soup" tag={["dinner", "weeknight"]} />);

  await userEvent.click(screen.getByRole("button", { name: "Remove dinner" }));
  expect(replaceMock).toHaveBeenLastCalledWith("/recipes?q=soup&tag=weeknight", {
    scroll: false,
  });

  await userEvent.click(screen.getByRole("button", { name: "Remove weeknight" }));
  expect(replaceMock).toHaveBeenLastCalledWith("/recipes?q=soup", { scroll: false });
});

test("clearing all filters navigates to the bare recipes URL", async () => {
  render(<RecipeFilters q="soup" tag="dinner" />);
  const search = screen.getByRole("searchbox", { name: "Search title" });

  fireEvent.change(search, { target: { value: "   " } });
  await userEvent.click(screen.getByRole("button", { name: "Remove dinner" }));

  expect(replaceMock).toHaveBeenCalledWith("/recipes", { scroll: false });
});
