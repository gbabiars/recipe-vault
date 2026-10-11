import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type {
  DocumentTagInventoryItem,
  DocumentTagInventoryOptions,
} from "@/lib/db/tag-repository";
import TagsPage from "./page";

const { listFromRecipesMock } = vi.hoisted(() => ({ listFromRecipesMock: vi.fn() }));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "owner-ada" }),
}));
vi.mock("@/lib/recipes", () => ({
  getTagService: async () => ({ listFromRecipes: listFromRecipesMock }),
}));

const allTags: DocumentTagInventoryItem[] = Array.from({ length: 53 }, (_, index) => ({
  name: `page tag ${String(index + 1).padStart(3, "0")}`,
  usageCount: index + 1,
}));

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

function nextCursor() {
  const href = screen.getByRole("link", { name: "Next" }).getAttribute("href");
  if (!href) throw new Error("Missing Next link href");
  const cursor = new URL(href, "http://recipe-vault.test").searchParams.get("after");
  if (!cursor) throw new Error("Missing after cursor");
  return cursor;
}

beforeEach(() => listFromRecipesMock.mockReset());
afterEach(() => cleanup());

test("reads only document-derived names and counts for the authenticated owner", async () => {
  listFromRecipesMock.mockResolvedValue({
    tags: [allTags[0], allTags[1]],
    hasMore: false,
  });

  await renderPage();

  expect(screen.getByRole("heading", { level: 1, name: "Tags" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: allTags[0]!.name })).toHaveAttribute(
    "href",
    "/recipes?tag=page%20tag%20001",
  );
  expect(screen.getByText("1 recipe")).toBeInTheDocument();
  expect(screen.getByText("2 recipes")).toBeInTheDocument();
  expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  expect(listFromRecipesMock).toHaveBeenCalledWith("owner-ada", {
    sort: "name_asc",
    limit: 25,
  });
});

test("next cursor visits document tags once in name order", async () => {
  listFromRecipesMock.mockImplementation(
    async (
      _ownerId: string,
      options: DocumentTagInventoryOptions = { sort: "name_asc", limit: 25 },
    ) => {
      const start = options.after
        ? allTags.findIndex((tag) => tag.name === options.after?.name) + 1
        : 0;
      return { tags: allTags.slice(start, start + 25), hasMore: start + 25 < allTags.length };
    },
  );

  await renderPage();
  const names = [...listedNames()];
  const cursor = nextCursor();
  cleanup();
  await renderPage({ after: cursor });
  names.push(...listedNames());
  const secondCursor = nextCursor();
  cleanup();
  await renderPage({ after: secondCursor });
  names.push(...listedNames());

  expect(names).toEqual(allTags.map((tag) => tag.name));
  expect(new Set(names).size).toBe(allTags.length);
  expect(listFromRecipesMock).toHaveBeenNthCalledWith(2, "owner-ada", {
    sort: "name_asc",
    limit: 25,
    after: { name: allTags[24]!.name },
  });
});

test("invalid and unsupported reverse cursors restart at page one", async () => {
  listFromRecipesMock.mockResolvedValue({ tags: [allTags[0]], hasMore: false });

  await renderPage({ after: "malformed", before: "unsupported" });

  expect(listFromRecipesMock).toHaveBeenCalledWith("owner-ada", {
    sort: "name_asc",
    limit: 25,
  });
});

test("shows the empty inventory state", async () => {
  listFromRecipesMock.mockResolvedValue({ tags: [], hasMore: false });

  await renderPage();

  expect(screen.getByRole("heading", { level: 2, name: "No tags yet" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Tag pages" })).not.toBeInTheDocument();
});
