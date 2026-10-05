import type { Preview } from "@storybook/nextjs-vite";
import Link from "next/link";
import { fn, sb } from "storybook/test";

import { LinkRendererProvider } from "../src/components/ui/link-renderer";
import { TooltipProvider } from "../src/components/ui/tooltip";
import "../src/app/globals.css";
import "./preview.css";

sb.mock(import("../src/features/recipes/actions.ts"), () => ({
  saveRecipeAction: fn(),
}));
const preview: Preview = {
  decorators: [
    (Story) => (
      <LinkRendererProvider link={<Link href="/" />}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </LinkRendererProvider>
    ),
  ],
  parameters: {
    options: {
      storySort: {
        method: "alphabetical-by-kind",
        locales: "en",
      },
    },
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
