import { z } from "zod";

export const recipeChatMessageSchema = z
  .object({
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.literal("text"), text: z.string() }).passthrough()).min(1),
  })
  .passthrough();

export const recipeChatRequestSchema = z
  .object({ messages: z.array(z.unknown()).min(1) })
  .passthrough();
