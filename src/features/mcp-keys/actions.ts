"use server";

import { revalidatePath } from "next/cache";
import { createMcpApiKey, revokeMcpApiKey } from "@/lib/auth/clerk-api-keys";
import { requireUser } from "@/lib/auth/require-user";
import { mcpKeyAccess, parseMcpKeyRequest } from "./mcp-key-policy";

export type McpKeyFormState = { error?: string; secret?: string; name?: string };

export async function createMcpKeyAction(
  _: McpKeyFormState,
  formData: FormData,
): Promise<McpKeyFormState> {
  const request = parseMcpKeyRequest({
    name: formData.get("name"),
    access: formData.get("access"),
    expiration: formData.get("expiration"),
  });
  if ("error" in request) return { error: request.error };
  const user = await requireUser();
  try {
    const key = await createMcpApiKey(
      user.id,
      request.name,
      [...mcpKeyAccess[request.access]],
      request.expirationDays,
    );
    revalidatePath("/mcp-keys");
    return { name: key.name, secret: key.secret };
  } catch {
    return { error: "Unable to create this MCP key. Please try again." };
  }
}

export async function revokeMcpKeyAction(formData: FormData): Promise<void> {
  const apiKeyId = formData.get("apiKeyId");
  if (typeof apiKeyId !== "string" || !apiKeyId.trim() || apiKeyId.length > 128) return;
  const user = await requireUser();
  try {
    await revokeMcpApiKey(user.id, apiKeyId);
    revalidatePath("/mcp-keys");
  } catch {
    // Keep key-management failures private; the page remains usable for other keys.
  }
}
