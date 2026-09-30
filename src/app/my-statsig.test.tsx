import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import MyStatsig from "./my-statsig";

type User = { userID?: string; email?: string };

const { useUser, useClientAsyncInit, client, context } = vi.hoisted(() => {
  const context: { user: User } = { user: {} };
  const client = {
    loadingStatus: "Ready",
    getContext: () => context,
    updateUserAsync: vi.fn(),
    updateUserSync: vi.fn(),
  };
  return { useUser: vi.fn(), useClientAsyncInit: vi.fn(), client, context };
});

vi.mock("@clerk/nextjs", () => ({ useUser }));
vi.mock("@statsig/react-bindings", () => ({
  useClientAsyncInit,
  StatsigProvider: ({ children }: { children: ReactNode }) => children,
}));

function setClerkUser(id?: string, email?: string) {
  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: Boolean(id),
    user: id ? { id, primaryEmailAddress: email ? { emailAddress: email } : null } : null,
  });
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function app() {
  return (
    <MyStatsig>
      <div>Gate consumer</div>
    </MyStatsig>
  );
}

beforeEach(() => {
  let initialized = false;
  context.user = {};
  client.loadingStatus = "Ready";
  useClientAsyncInit.mockImplementation((_key: string, user: User) => {
    if (!initialized) {
      context.user = user;
      initialized = true;
    }
    return { client, isLoading: false };
  });
  client.updateUserAsync.mockImplementation(async (user: User) => {
    context.user = user;
  });
  client.updateUserSync.mockImplementation((user: User) => {
    context.user = user;
    client.loadingStatus = "Ready";
  });
  setClerkUser("user_ada", "ada@example.com");
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("waits for Clerk before initializing or rendering gate consumers", () => {
  useUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
  render(app());
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(screen.queryByText("Gate consumer")).toBeNull();
  expect(useClientAsyncInit).not.toHaveBeenCalled();
});

test("initializes with only the Clerk ID and primary email", async () => {
  render(app());
  await screen.findByText("Gate consumer");
  expect(useClientAsyncInit).toHaveBeenCalledWith(expect.stringMatching(/^client-/), {
    userID: "user_ada",
    email: "ada@example.com",
  });
  expect(client.updateUserAsync).not.toHaveBeenCalled();
});

test("waits for initialization before synchronizing a changed Clerk identity", async () => {
  useClientAsyncInit.mockReturnValue({ client, isLoading: true });
  const view = render(app());
  expect(screen.queryByText("Gate consumer")).toBeNull();
  setClerkUser("user_grace");
  view.rerender(app());
  expect(client.updateUserAsync).not.toHaveBeenCalled();
  useClientAsyncInit.mockReturnValue({ client, isLoading: false });
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserAsync).toHaveBeenCalledWith({ userID: "user_grace" });
});

test("omits unavailable email", async () => {
  setClerkUser("user_ada");
  render(app());
  await screen.findByText("Gate consumer");
  expect(context.user).toEqual({ userID: "user_ada" });
});

test("initializes anonymously after Clerk confirms sign-out", async () => {
  setClerkUser();
  render(app());
  await screen.findByText("Gate consumer");
  expect(context.user).toEqual({});
});

test("refreshes on sign-in and clears the identity on sign-out", async () => {
  setClerkUser();
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_ada", "ada@example.com");
  view.rerender(app());
  await waitFor(() =>
    expect(client.updateUserAsync).toHaveBeenCalledWith({
      userID: "user_ada",
      email: "ada@example.com",
    }),
  );
  await screen.findByText("Gate consumer");
  setClerkUser();
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserAsync).toHaveBeenLastCalledWith({});
  expect(context.user).toEqual({});
});

test("refreshes changed email and removes a missing primary email", async () => {
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_ada", "new@example.com");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserAsync).toHaveBeenLastCalledWith({
    userID: "user_ada",
    email: "new@example.com",
  });
  setClerkUser("user_ada");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserAsync).toHaveBeenLastCalledWith({ userID: "user_ada" });
});

test("does not refresh when Clerk replaces a profile with unchanged targeting fields", async () => {
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_ada", "ada@example.com");
  view.rerender(app());
  expect(client.updateUserAsync).not.toHaveBeenCalled();
});

test("hides consumers until the latest account update completes", async () => {
  const first = deferred();
  const latest = deferred();
  client.updateUserAsync
    .mockImplementationOnce((user: User) => {
      context.user = user;
      return first.promise;
    })
    .mockImplementationOnce((user: User) => {
      context.user = user;
      return latest.promise;
    });
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace", "grace@example.com");
  view.rerender(app());
  expect(screen.queryByText("Gate consumer")).toBeNull();
  setClerkUser("user_lin", "lin@example.com");
  view.rerender(app());
  await act(async () => first.resolve());
  expect(screen.queryByText("Gate consumer")).toBeNull();
  await act(async () => latest.resolve());
  await screen.findByText("Gate consumer");
  expect(context.user.userID).toBe("user_lin");
});

test("a late completion does not reopen loading or restore an earlier identity", async () => {
  const earlier = deferred();
  client.updateUserAsync.mockImplementationOnce((user: User) => {
    context.user = user;
    return earlier.promise;
  });
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace");
  view.rerender(app());
  setClerkUser();
  view.rerender(app());
  await screen.findByText("Gate consumer");
  await act(async () => earlier.resolve());
  expect(screen.getByText("Gate consumer")).toBeInTheDocument();
  expect(context.user).toEqual({});
});

test("unexpected rejection uses the current user's cache and releases loading", async () => {
  client.updateUserAsync.mockRejectedValueOnce(new Error("Offline"));
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserSync).toHaveBeenCalledWith(
    { userID: "user_grace" },
    {
      disableBackgroundCacheRefresh: true,
    },
  );
  expect(context.user).toEqual({ userID: "user_grace" });
});

test("an earlier rejection cannot replace the latest user with cached values", async () => {
  const earlier = deferred();
  client.updateUserAsync.mockImplementationOnce((user: User) => {
    context.user = user;
    return earlier.promise;
  });
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace");
  view.rerender(app());
  setClerkUser();
  view.rerender(app());
  await screen.findByText("Gate consumer");
  await act(async () => earlier.reject(new Error("Offline")));
  expect(client.updateUserSync).not.toHaveBeenCalled();
  expect(context.user).toEqual({});
});

test("a resolved SDK failure still releases loading with the current user's cache", async () => {
  client.updateUserAsync.mockImplementationOnce(async (user: User) => {
    context.user = user;
    client.loadingStatus = "Loading";
    return { success: false, error: new Error("Offline") };
  });
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserSync).toHaveBeenCalledWith(
    { userID: "user_grace" },
    {
      disableBackgroundCacheRefresh: true,
    },
  );
  expect(client.loadingStatus).toBe("Ready");
});
