import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { BREAKPOINT_MEDIA_QUERIES } from "./use-breakpoint";
import { useBreakpoint } from "./use-breakpoint";

function ServerBreakpointOutput() {
  return createElement("output", null, String(useBreakpoint("md")));
}

test("renders the false breakpoint snapshot on the server", () => {
  assert.match(renderToString(createElement(ServerBreakpointOutput)), /<output>false<\/output>/);
});

test("breakpoint media queries match viewport.css definitions", async () => {
  const viewportCss = await readFile(new URL("../viewport.css", import.meta.url), "utf8");
  const cssQueries = Object.fromEntries(
    [...viewportCss.matchAll(/@custom-media --viewport-(sm|md|lg|xl)\s+(\([^;]+\));/g)].map(
      ([, breakpoint, query]) => [breakpoint, query],
    ),
  );

  assert.deepEqual(cssQueries, BREAKPOINT_MEDIA_QUERIES);
});
