import type { Preview } from "@storybook/nextjs-vite";
import { fn, sb } from "storybook/test";

import "../src/app/globals.css";
import "./preview.css";

sb.mock(import("../src/features/recipes/actions.ts"), () => ({
  saveRecipeAction: fn(),
}));
sb.mock(import("@statsig/react-bindings"), { spy: true });

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
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
