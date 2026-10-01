import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createLaunchDarklyUserConfig } from "../src/lib/launchdarkly";

test("creates a secure LaunchDarkly user context from the Clerk ID", () => {
  const config = createLaunchDarklyUserConfig("user_ada", {
    NEXT_PUBLIC_LD_CLIENT_ID: "client-side-id",
    LD_SDK_KEY: "server-side-sdk-key",
  });

  assert.deepEqual(config, {
    clientSideID: "client-side-id",
    context: { kind: "user", key: "user_ada" },
    hash: createHmac("sha256", "server-side-sdk-key").update("user_ada", "utf8").digest("hex"),
  });
});

test("disables LaunchDarkly when either key is missing or still a placeholder", () => {
  assert.equal(
    createLaunchDarklyUserConfig("user_ada", {
      NEXT_PUBLIC_LD_CLIENT_ID: "client-side-id",
    }),
    null,
  );
  assert.equal(
    createLaunchDarklyUserConfig("user_ada", {
      LD_SDK_KEY: "server-side-sdk-key",
    }),
    null,
  );
  assert.equal(
    createLaunchDarklyUserConfig("user_ada", {
      NEXT_PUBLIC_LD_CLIENT_ID: "your-client-side-id",
      LD_SDK_KEY: "server-side-sdk-key",
    }),
    null,
  );
});
