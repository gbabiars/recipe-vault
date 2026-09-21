import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

type RecipeView = {
  title: string;
  summary?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  tags: string[];
  dietaryFlags: string[];
  ingredients: Array<{
    quantity: number;
    unit: string;
    ingredientName: string;
    notes?: string;
  }>;
  steps: Array<{ instruction: string; durationMinutes?: number }>;
  notes?: string;
  sourceUrl?: string;
};

const app = new App({ name: "recipe-vault-recipe-view", version: "1.0.0" });

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function section(title: string) {
  const container = element("section");
  container.append(element("h2", title));
  return container;
}

function renderLoading() {
  const root = element("main");
  root.className = "recipe-view loading";
  root.setAttribute("aria-busy", "true");
  root.append(element("p", "Loading recipe…"));
  document.body.replaceChildren(root);
}

function renderError() {
  const root = element("main");
  root.className = "recipe-view error";
  root.setAttribute("role", "alert");
  root.append(element("p", "This recipe could not be displayed."));
  document.body.replaceChildren(root);
}

function hasOptionalString(value: unknown): value is string {
  return value === undefined || typeof value === "string";
}

function isRecipeView(value: unknown): value is RecipeView {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Record<string, unknown>;
  return (
    typeof recipe.title === "string" &&
    hasOptionalString(recipe.summary) &&
    hasOptionalString(recipe.notes) &&
    hasOptionalString(recipe.sourceUrl) &&
    Array.isArray(recipe.tags) &&
    recipe.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(recipe.dietaryFlags) &&
    recipe.dietaryFlags.every((flag) => typeof flag === "string") &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.every(
      (ingredient) =>
        ingredient &&
        typeof ingredient === "object" &&
        typeof (ingredient as Record<string, unknown>).quantity === "number" &&
        typeof (ingredient as Record<string, unknown>).unit === "string" &&
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

function renderLabels(recipe: RecipeView) {
  const labels = [
    ...recipe.tags.map((tag) => `Tag: ${tag}`),
    ...recipe.dietaryFlags.map((flag) => `Dietary: ${flag}`),
  ];
  if (labels.length === 0) return null;
  const list = element("ul");
  list.className = "labels";
  for (const label of labels) list.append(element("li", label));
  return list;
}

function renderRecipe(recipe: RecipeView) {
  const root = element("main");
  root.className = "recipe-view";

  const header = element("header");
  header.append(element("h1", recipe.title));
  if (recipe.summary) header.append(element("p", recipe.summary));
  const labels = renderLabels(recipe);
  if (labels) header.append(labels);
  root.append(header);

  const details = [
    recipe.prepTimeMinutes === undefined ? undefined : `Prep: ${recipe.prepTimeMinutes} min`,
    recipe.cookTimeMinutes === undefined ? undefined : `Cook: ${recipe.cookTimeMinutes} min`,
    recipe.totalTimeMinutes === undefined ? undefined : `Total: ${recipe.totalTimeMinutes} min`,
    recipe.servings === undefined ? undefined : `Serves: ${recipe.servings}`,
  ].filter((detail): detail is string => detail !== undefined);
  if (details.length > 0) {
    const timing = element("p", details.join(" · "));
    timing.className = "timing";
    root.append(timing);
  }

  const ingredients = section("Ingredients");
  const ingredientList = element("ul");
  for (const ingredient of recipe.ingredients) {
    const item = element(
      "li",
      `${ingredient.quantity} ${ingredient.unit} ${ingredient.ingredientName}`,
    );
    if (ingredient.notes) item.append(document.createTextNode(` (${ingredient.notes})`));
    ingredientList.append(item);
  }
  ingredients.append(ingredientList);
  root.append(ingredients);

  const steps = section("Steps");
  const stepList = element("ol");
  for (const step of recipe.steps) {
    const item = element("li", step.instruction);
    if (step.durationMinutes !== undefined)
      item.append(document.createTextNode(` (${step.durationMinutes} min)`));
    stepList.append(item);
  }
  steps.append(stepList);
  root.append(steps);

  if (recipe.notes) {
    const notes = section("Notes");
    const copy = element("p", recipe.notes);
    copy.className = "notes";
    notes.append(copy);
    root.append(notes);
  }

  if (recipe.sourceUrl) {
    const source = element("p");
    source.className = "source";
    source.append(element("strong", "Source: "), document.createTextNode(recipe.sourceUrl));
    root.append(source);
  }

  document.body.replaceChildren(root);
}

function applyHostStyles() {
  const context = app.getHostContext();
  if (!context) return;
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
}

app.ontoolresult = ({ structuredContent, isError }) => {
  const recipe = (structuredContent as { recipe?: unknown } | undefined)?.recipe;
  if (isError || !isRecipeView(recipe)) {
    renderError();
    return;
  }
  renderRecipe(recipe);
};
app.ontoolcancelled = renderError;
app.onhostcontextchanged = applyHostStyles;

renderLoading();
void app.connect().then(applyHostStyles).catch(renderError);
