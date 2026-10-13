import { z } from "zod";

export const tagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9 _-]*$/i, "Use letters, numbers, spaces, underscores, or hyphens.")
  .transform((label) => label.replace(/ +/g, " ").toLowerCase());
