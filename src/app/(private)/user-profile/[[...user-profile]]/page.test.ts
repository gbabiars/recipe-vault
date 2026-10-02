import assert from "node:assert/strict";
import test from "node:test";

test("the private user-profile route remains available", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const profilePage = new URL("./page.tsx", import.meta.url);
  assert.equal(existsSync(profilePage), true);
  const page = readFileSync(profilePage, "utf8");
  assert.match(page, /<UserProfile /);
  assert.match(page, /requireUser\(\)/);
});
