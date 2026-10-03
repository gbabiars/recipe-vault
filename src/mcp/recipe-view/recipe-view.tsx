import { App, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";

import "../../app/globals.css";
import { RecipeView, type RecipeViewData } from "./recipe-view-component";

const app = new App({ name: "recipe-vault-recipe-view", version: "1.0.0" });
const container = document.getElementById("root");

if (!container) {
  throw new Error("The recipe view root element is missing.");
}

const root = createRoot(container);

function hasOptionalString(value: unknown): value is string {
  return value === undefined || typeof value === "string";
}

function isRecipeView(value: unknown): value is RecipeViewData {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Record<string, unknown>;
  return (
    typeof recipe.title === "string" &&
    hasOptionalString(recipe.summary) &&
    hasOptionalString(recipe.notes) &&
    hasOptionalString(recipe.sourceUrl) &&
    Array.isArray(recipe.tags) &&
    recipe.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.every(
      (ingredient) =>
        ingredient &&
        typeof ingredient === "object" &&
        hasOptionalString((ingredient as Record<string, unknown>).amount) &&
        typeof (ingredient as Record<string, unknown>).ingredientName === "string" &&
        hasOptionalString((ingredient as Record<string, unknown>).notes),
    ) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.every(
      (step) =>
        step &&
        typeof step === "object" &&
        typeof (step as Record<string, unknown>).instruction === "string" &&
        ((step as Record<string, unknown>).durationMinutes === undefined ||
          typeof (step as Record<string, unknown>).durationMinutes === "number"),
    )
  );
}

function renderLoading() {
  root.render(<RecipeView state="loading" />);
}

function renderError() {
  root.render(<RecipeView state="error" />);
}

function applyHostStyles() {
  const context = app.getHostContext();
  if (!context) return;

  if (context.theme) applyDocumentTheme(context.theme);

  const hostFont = context.styles?.variables?.["--font-sans"];
  if (hostFont) {
    document.documentElement.style.setProperty("--font-sans", hostFont);
  } else {
    document.documentElement.style.removeProperty("--font-sans");
  }

  if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
}

app.ontoolresult = ({ structuredContent, isError }) => {
  const recipe = (structuredContent as { recipe?: unknown } | undefined)?.recipe;
  if (isError || !isRecipeView(recipe)) {
    renderError();
    return;
  }

  root.render(<RecipeView state="recipe" recipe={recipe} />);
};
app.ontoolcancelled = renderError;
app.onhostcontextchanged = applyHostStyles;

renderLoading();
void app.connect().then(applyHostStyles).catch(renderError);
