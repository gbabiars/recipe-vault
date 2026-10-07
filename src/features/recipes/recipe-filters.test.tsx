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
