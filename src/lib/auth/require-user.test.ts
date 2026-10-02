import assert from "node:assert/strict";
import test from "node:test";
import { ensureAuthenticatedUser } from "./require-user";

test("unauthenticated recipe requests are redirected to sign-in", () => {
  assert.throws(
    () =>
      ensureAuthenticatedUser(null, () => {
        throw new Error("redirect:/sign-in");
      }),
    /redirect:\/sign-in/,
  );
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "owner" }, () => {
      throw new Error("unreachable");
    }),
    { id: "owner" },
  );
});

test("every signed-in Clerk user receives an authenticated application identity", () => {
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "user_one" }, () => {
      throw new Error("unreachable");
    }),
    { id: "user_one" },
  );
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "user_two" }, () => {
      throw new Error("unreachable");
    }),
    { id: "user_two" },
  );
});
