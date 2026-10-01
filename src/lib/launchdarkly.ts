import { createHmac } from "node:crypto";

export type LaunchDarklyUserConfig = {
  clientSideID: string;
  context: { kind: "user"; key: string };
  hash: string;
};

type LaunchDarklyEnvironment = {
  NEXT_PUBLIC_LD_CLIENT_ID?: string;
  LD_SDK_KEY?: string;
};

function usableValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("your-");
}

/** Creates an authenticated Clerk context and secure-mode hash for the browser SDK. */
export function createLaunchDarklyUserConfig(
  userId: string,
  env: LaunchDarklyEnvironment = {
    NEXT_PUBLIC_LD_CLIENT_ID: process.env.NEXT_PUBLIC_LD_CLIENT_ID,
    LD_SDK_KEY: process.env.LD_SDK_KEY,
  },
): LaunchDarklyUserConfig | null {
  const clientSideID = env.NEXT_PUBLIC_LD_CLIENT_ID?.trim();
  const sdkKey = env.LD_SDK_KEY?.trim();

  if (!userId || !usableValue(clientSideID) || !usableValue(sdkKey)) return null;

  return {
    clientSideID,
    context: { kind: "user", key: userId },
    hash: createHmac("sha256", sdkKey).update(userId, "utf8").digest("hex"),
  };
}
