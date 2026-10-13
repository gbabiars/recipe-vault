import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { RecipeSnapshot } from "@/lib/db/recipe-repository";
import EditRecipePage from "./page";

const snapshot: RecipeSnapshot = {
  recipe: {
    id: "recipe-1",
    title: "Quick pickled onions",
    description: "Tangy onions for tacos.",
    time: { prepMinutes: 10 },
    ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
    equipment: [{ name: "jar" }],
    instructions: ["Put the onion in a jar."],
    notes: ["Refrigerate overnight."],
    tags: ["condiments"],
  },
  revision: 7,
};

const { getRecipeMock, pushMock } = vi.hoisted(() => ({
  getRecipeMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ getRecipe: getRecipeMock }),
}));
vi.mock("@/app/(private)/recipes/_actions/recipe-document-actions", () => ({
  saveRecipeDocumentAction: async () => ({ status: "saved" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: pushMock }),
}));

test("loads the owner-scoped document snapshot into the edit form", async () => {
  getRecipeMock.mockResolvedValue(snapshot);
  render(await EditRecipePage({ params: Promise.resolve({ id: "recipe-1" }) }));

  expect(getRecipeMock).toHaveBeenCalledWith("user-1", "recipe-1");
  expect(screen.getByRole("heading", { level: 1, name: "Edit recipe" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Quick pickled onions");
  expect(screen.getByRole("textbox", { name: "Direction" })).toHaveValue("Put the onion in a jar.");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
  expect(within(breadcrumbs).getByRole("link", { name: "Quick pickled onions" })).toHaveAttribute(
    "href",
    "/recipes/recipe-1",
  );
});

test("not-found response is used when no owner-scoped document exists", async () => {
  getRecipeMock.mockResolvedValueOnce(null);
  await expect(EditRecipePage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(
    "NOT_FOUND",
  );
  expect(getRecipeMock).toHaveBeenCalledWith("user-1", "missing");
});
