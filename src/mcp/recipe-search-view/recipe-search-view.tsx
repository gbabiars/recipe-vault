import { App, applyDocumentTheme, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";

import "../../app/globals.css";
import { RecipeSearchView } from "./recipe-search-view-component";
import { getRecipeSearchViewState } from "./recipe-search-view-state";

const app = new App({ name: "recipe-vault-search-results", version: "1.0.0" });
const container = document.getElementById("root");

if (!container) {
  throw new Error("The search results root element is missing.");
}

const root = createRoot(container);

function renderError() {
  root.render(<RecipeSearchView state="error" />);
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
  root.render(<RecipeSearchView {...getRecipeSearchViewState(structuredContent, isError)} />);
};
app.ontoolcancelled = renderError;
app.onhostcontextchanged = applyHostStyles;

root.render(<RecipeSearchView state="loading" />);
void app.connect().then(applyHostStyles).catch(renderError);
