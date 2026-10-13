import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { RecipeSnapshot } from "@/lib/db/recipe-repository";
import RecipePage from "./page";

const snapshot: RecipeSnapshot = {
  recipe: {
    id: "recipe-1",
    title: "Garlic fried rice",
    description: "A quick dinner made with cold rice.",
    yield: { amount: 4, unit: "servings" },
    time: { prepMinutes: 15, cookMinutes: 12, totalMinutes: 27 },
    ingredients: [{ name: "cooked white rice", amount: "6 cups", note: "cooled" }],
    equipment: [{ name: "wok" }],
    instructions: ["Heat the wok.", "Fry the rice."],
    notes: ["Work in batches."],
    tags: ["rice", "weeknight"],
  },
  revision: 9,
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
  deleteRecipeDocumentAction: async () => ({ status: "deleted" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: pushMock }),
}));

test("loads the owner-scoped document and renders its metadata and ordered detail cards", async () => {
  getRecipeMock.mockResolvedValue(snapshot);
  render(
    <ToastProvider>
      {await RecipePage({ params: Promise.resolve({ id: snapshot.recipe.id }) })}
    </ToastProvider>,
  );

  expect(getRecipeMock).toHaveBeenCalledWith("user-1", "recipe-1");
  expect(screen.getByRole("heading", { level: 1, name: "Garlic fried rice" })).toBeTruthy();
  expect(screen.getByText("A quick dinner made with cold rice.")).toBeTruthy();
  expect(screen.getByText("4 servings")).toBeTruthy();
  expect(screen.getByText("rice")).toBeTruthy();
  expect(screen.getByText("weeknight")).toBeTruthy();
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toEqual(["Details", "Ingredients", "Equipment", "Method", "Notes"]);
  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
  expect(within(breadcrumbs).getByRole("link", { name: "Recipes" })).toHaveAttribute(
    "href",
    "/recipes",
  );
});

test("renders optional yield by omission when the source does not state it", async () => {
  getRecipeMock.mockResolvedValueOnce({
    ...snapshot,
    recipe: { ...snapshot.recipe, yield: undefined },
  });
  render(
    <ToastProvider>
      {await RecipePage({ params: Promise.resolve({ id: snapshot.recipe.id }) })}
    </ToastProvider>,
  );

  expect(screen.queryByText("Yield")).toBeNull();
  expect(screen.getByRole("heading", { level: 1, name: "Garlic fried rice" })).toBeTruthy();
});

test("uses not-found when no document belongs to the current user", async () => {
  getRecipeMock.mockResolvedValueOnce(null);
  await expect(RecipePage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(
    "NOT_FOUND",
  );
  expect(getRecipeMock).toHaveBeenCalledWith("user-1", "missing");
});
