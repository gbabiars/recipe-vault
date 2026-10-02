import assert from "node:assert/strict";
import test from "node:test";

test("the application has no registration route or registration UI", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  assert.equal(existsSync(new URL("../../sign-up", import.meta.url)), false);
  assert.doesNotMatch(
    readFileSync(new URL("./page.tsx", import.meta.url), "utf8"),
    /signUp|register|invitation/i,
  );
});

test("the sign-in route accepts Clerk's nested authentication steps", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const signInPage = new URL("./page.tsx", import.meta.url);
  assert.equal(existsSync(signInPage), true);
  assert.match(readFileSync(signInPage, "utf8"), /<SignIn /);
});
