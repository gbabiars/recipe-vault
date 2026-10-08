import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TagInventoryItem, TagListOptions } from "@/lib/db/tag-repository";
import TagsPage from "./page";

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "owner-ada" }),
}));
vi.mock("@/lib/recipes", () => ({
  getTagService: async () => ({ list: listMock }),
}));

const allTags: TagInventoryItem[] = Array.from({ length: 53 }, (_, index) => {
  const number = index + 1;
  return {
    id: `00000000-0000-4000-8000-${number.toString().padStart(12, "0")}`,
    name: `page tag ${number.toString().padStart(3, "0")}`,
    usageCount: number === 1 ? 0 : number % 3,
  };
});

type SearchParams = { after?: string | string[]; before?: string | string[] };

async function renderPage(searchParams: SearchParams = {}) {
  const page = await TagsPage({ searchParams: Promise.resolve(searchParams) });
  render(page);
}

function listedNames() {
  return Array.from(screen.getByRole("list", { name: "Tags" }).querySelectorAll("li a")).map(
    (link) => link.textContent,
  );
}

function cursorFromLink(name: "Previous" | "Next", direction: "before" | "after") {
  const href = screen.getByRole("link", { name }).getAttribute("href");
  if (!href) throw new Error(`Missing ${name} link href`);
  const cursor = new URL(href, "http://recipe-vault.test").searchParams.get(direction);
  if (!cursor) throw new Error(`Missing ${direction} cursor`);
  return cursor;
}

beforeEach(() => {
  listMock.mockReset();
});

afterEach(() => {
  cleanup();
});

test("shows exact tag counts and optional descriptions with matching recipe filters", async () => {
  listMock.mockResolvedValue({
    tags: [
      allTags[0]!,
      { ...allTags[1]!, usageCount: 1, description: "Easy dinners for busy evenings." },
    ],
    hasMore: false,
  });

  await renderPage();

  expect(screen.getByRole("heading", { level: 1, name: "Tags" })).toBeInTheDocument();
  const tagsList = screen.getByRole("list", { name: "Tags" });
  const listCard = tagsList.parentElement?.parentElement;
  expect(listCard).toHaveAttribute("data-padding", "none");
  expect(document.querySelectorAll('[data-padding="none"]')).toHaveLength(1);
  expect(screen.getByRole("link", { name: "page tag 001" })).toHaveAttribute(
    "href",
    "/recipes?tag=page%20tag%20001",
  );
  expect(screen.getAllByRole("listitem")[0]?.querySelector("span")?.textContent?.trim()).toBe(
    "0 recipes",
  );
  expect(
    screen
      .getAllByRole("listitem")[1]
      ?.querySelector("span")
      ?.textContent?.replace(/\s+/g, " ")
      .trim(),
  ).toBe("Easy dinners for busy evenings. · 1 recipe");
  expect(screen.queryByRole("link", { name: "0 recipes" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "1 recipe" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(listMock).toHaveBeenCalledWith("owner-ada", {
    usage: "all",
    sort: "name_asc",
    limit: 25,
  });
});

test("next and previous cursors walk every tag exactly once in name order", async () => {
  listMock.mockImplementation(async (_ownerId: string, options: TagListOptions) => {
    if (options.after) {
      const index = allTags.findIndex((tag) => tag.id === options.after?.id);
      const start = index + 1;
      return { tags: allTags.slice(start, start + 25), hasMore: start + 25 < allTags.length };
    }
    if (options.before) {
      const index = allTags.findIndex((tag) => tag.id === options.before?.id);
      const start = Math.max(0, index - 25);
      return { tags: allTags.slice(start, index), hasMore: start > 0 };
    }
    return { tags: allTags.slice(0, 25), hasMore: allTags.length > 25 };
  });

  await renderPage();
  const forwardNames = [...listedNames()];
  let cursor = cursorFromLink("Next", "after");

  cleanup();
  await renderPage({ after: cursor });
  forwardNames.push(...listedNames());
  cursor = cursorFromLink("Next", "after");

  cleanup();
  await renderPage({ after: cursor });
  forwardNames.push(...listedNames());

  expect(forwardNames).toEqual(allTags.map((tag) => tag.name));
  expect(new Set(forwardNames).size).toBe(allTags.length);
  expect(listMock.mock.calls.map((call) => call[0])).toEqual(Array(3).fill("owner-ada"));
  expect(listMock.mock.calls[1]![1]).toEqual({
    usage: "all",
    sort: "name_asc",
    limit: 25,
    after: allTags[24],
  });

  cursor = cursorFromLink("Previous", "before");
  cleanup();
  await renderPage({ before: cursor });
  expect(listedNames()).toEqual(allTags.slice(25, 50).map((tag) => tag.name));
  expect(screen.getByRole("link", { name: "Next" })).toBeInTheDocument();
  cursor = cursorFromLink("Previous", "before");

  cleanup();
  await renderPage({ before: cursor });
  expect(listedNames()).toEqual(allTags.slice(0, 25).map((tag) => tag.name));
  expect(screen.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
});

test("invalid cursor parameters restart at the first page", async () => {
  listMock.mockResolvedValue({ tags: [allTags[0]], hasMore: false });

  await renderPage({ after: "malformed", before: "also-malformed" });

  expect(listMock).toHaveBeenCalledWith("owner-ada", {
    usage: "all",
    sort: "name_asc",
    limit: 25,
  });
});

test("shows the empty inventory state", async () => {
  listMock.mockResolvedValue({ tags: [], hasMore: false });

  await renderPage();

  expect(screen.getByRole("heading", { level: 2, name: "No tags yet" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Tag pages" })).not.toBeInTheDocument();
});

test("shows a safe error state when the inventory cannot be loaded", async () => {
  listMock.mockRejectedValue(new Error("database detail must not be rendered"));

  await renderPage();

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Tags could not be loaded. Refresh the page to try again.",
  );
  expect(screen.queryByText("database detail must not be rendered")).not.toBeInTheDocument();
});
