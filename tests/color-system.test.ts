import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const globalsCss = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

const primitiveScales = {
  neutral: {
    "0": "#ffffff",
    "050": "#fafafa",
    "100": "#f5f5f5",
    "200": "#e5e5e5",
    "300": "#d4d4d4",
    "400": "#a3a3a3",
    "500": "#737373",
    "600": "#525252",
    "700": "#404040",
    "800": "#262626",
    "900": "#171717",
    "950": "#0a0a0a",
  },
  blue: {
    "050": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554",
  },
  green: {
    "050": "#f0fdf4",
    "100": "#dcfce7",
    "200": "#bbf7d0",
    "300": "#86efac",
    "400": "#4ade80",
    "500": "#22c55e",
    "600": "#16a34a",
    "700": "#15803d",
    "800": "#166534",
    "900": "#14532d",
    "950": "#052e16",
  },
  yellow: {
    "050": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03",
  },
  red: {
    "050": "#fef2f2",
    "100": "#fee2e2",
    "200": "#fecaca",
    "300": "#fca5a5",
    "400": "#f87171",
    "500": "#ef4444",
    "600": "#dc2626",
    "700": "#b91c1c",
    "800": "#991b1b",
    "900": "#7f1d1d",
    "950": "#450a0a",
  },
} as const;

const semanticTokens = [
  "background-canvas",
  "background-surface",
  "background-surface-subtle",
  "background-surface-hover",
  "background-surface-active",
  "background-surface-disabled",
  "background-overlay",
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "text-disabled",
  "text-inverse",
  "text-link",
  "text-link-hover",
  "border-subtle",
  "border-default",
  "border-strong",
  "border-focus",
  "border-disabled",
  "action-primary-background",
  "action-primary-background-hover",
  "action-primary-background-active",
  "action-primary-text",
  "action-primary-border",
  "action-danger-background",
  "action-danger-background-hover",
  "action-danger-background-active",
  "action-danger-text",
  "action-danger-border",
  "action-secondary-background",
  "action-secondary-background-hover",
  "action-secondary-background-active",
  "action-secondary-text",
  "action-secondary-border",
  "action-ghost-background",
  "action-ghost-background-hover",
  "action-ghost-text",
  "selection-background",
  "selection-text",
  "selection-icon",
  "focus-ring",
  "focus-ring-outer",
  "success-background",
  "success-border",
  "success-text",
  "success-icon",
  "warning-background",
  "warning-border",
  "warning-text",
  "warning-icon",
  "error-background",
  "error-border",
  "error-text",
  "error-icon",
] as const;

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  if (channels === undefined) throw new Error(`Invalid color: ${hex}`);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

test("defines every primitive scale with normalized token names", () => {
  for (const [family, scale] of Object.entries(primitiveScales)) {
    for (const [step, hex] of Object.entries(scale)) {
      assert.match(globalsCss, new RegExp(`--color-${family}-${step}: ${hex};`));
    }
  }

  assert.doesNotMatch(globalsCss, /--color-(?:neutral|blue|green|yellow|red)-50:/);
  assert.doesNotMatch(globalsCss, /--color-neutral-00:/);
});

test("defines the same semantic token API for light and dark themes", () => {
  for (const token of semanticTokens) {
    const declarations = globalsCss.match(new RegExp(`--color-${token}:`, "g")) ?? [];
    assert.ok(
      declarations.length >= 3,
      `Expected light, explicit dark, and system dark declarations for ${token}`,
    );
  }

  assert.match(globalsCss, /:root\[data-theme="dark"\]/);
  assert.match(globalsCss, /@media \(prefers-color-scheme: dark\)/);
  assert.match(globalsCss, /:root:not\(\[data-theme="light"\]\)/);
});

test("does not retain legacy color variable names", () => {
  for (const token of [
    "text-brand",
    "text-success",
    "text-warning",
    "text-danger",
    "text-info",
    "background-neutral-subtle",
    "background-neutral-emphasis",
    "background-brand-subtle",
    "background-brand-emphasis",
    "background-success-subtle",
    "background-success-emphasis",
    "background-warning-subtle",
    "background-warning-emphasis",
    "background-danger-subtle",
    "background-danger-emphasis",
    "background-info-subtle",
    "background-info-emphasis",
    "border-neutral",
    "border-danger",
  ]) {
    assert.doesNotMatch(globalsCss, new RegExp(`--color-${token}:`));
  }
});

test("key foreground and background pairs meet normal-text contrast", () => {
  const passingPairs = [
    ["#171717", "#fafafa"],
    ["#525252", "#fafafa"],
    ["#2563eb", "#fafafa"],
    ["#ffffff", "#2563eb"],
    ["#15803d", "#f0fdf4"],
    ["#92400e", "#fffbeb"],
    ["#b91c1c", "#fef2f2"],
    ["#ffffff", "#dc2626"],
    ["#f5f5f5", "#0a0a0a"],
    ["#a3a3a3", "#0a0a0a"],
    ["#60a5fa", "#0a0a0a"],
    ["#0a0a0a", "#3b82f6"],
    ["#86efac", "#052e16"],
    ["#fcd34d", "#451a03"],
    ["#fca5a5", "#450a0a"],
    ["#0a0a0a", "#ef4444"],
  ] as const;

  for (const [foreground, background] of passingPairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} does not meet 4.5:1 contrast`,
    );
  }
});
