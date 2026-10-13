import { vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => import("./src/lib/auth/__mocks__/require-user"));
vi.mock("@/lib/recipes", () => import("./src/lib/recipes/__mocks__/index"));
