import { App, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";

import "../../app/globals.css";
import { RecipeView } from "./recipe-view-component";
import { getRecipeViewState } from "./recipe-view-state";

const app = new App({ name: "recipe-vault-recipe-view", version: "1.0.0" });
const container = document.getElementById("root");

if (!container) {
  throw new Error("The recipe view root element is missing.");
}

const root = createRoot(container);

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
  root.render(<RecipeView {...getRecipeViewState(structuredContent, isError)} />);
};
app.ontoolcancelled = renderError;
app.onhostcontextchanged = applyHostStyles;

renderLoading();
void app.connect().then(applyHostStyles).catch(renderError);
