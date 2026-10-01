import type { Preview } from "@storybook/nextjs-vite";
import { fn, sb } from "storybook/test";

import "../src/app/globals.css";
import "./preview.css";

sb.mock(import("../src/features/recipes/actions.ts"), () => ({
  saveRecipeAction: fn(),
}));
const preview: Preview = {
  parameters: {
    docs: {
      codePanel: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: "error",
    },
  },
};

export default preview;
