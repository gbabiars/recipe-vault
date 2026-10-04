import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAppSidebarPreferenceCookieValue,
  isAppSidebarCollapsedForUser,
} from "./app-sidebar-preference";

test("stores expanded and collapsed sidebar values with the account ID", () => {
  assert.equal(getAppSidebarPreferenceCookieValue("user_ada", true), "user_ada:collapsed");
  assert.equal(getAppSidebarPreferenceCookieValue("user_ada", false), "user_ada:expanded");
});

test("only applies the collapsed preference to the matching account", () => {
  assert.equal(isAppSidebarCollapsedForUser("user_ada:collapsed", "user_ada"), true);
  assert.equal(isAppSidebarCollapsedForUser("user_grace:collapsed", "user_ada"), false);
  assert.equal(isAppSidebarCollapsedForUser("user_ada:expanded", "user_ada"), false);
  assert.equal(isAppSidebarCollapsedForUser(undefined, "user_ada"), false);
});
