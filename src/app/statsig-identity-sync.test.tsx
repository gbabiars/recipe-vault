import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import StatsigIdentitySync from "./statsig-identity-sync";

type User = { userID?: string };

const { useUser, useStatsigClient, client, context } = vi.hoisted(() => {
  const context: { user: User } = { user: { userID: "user_ada" } };
  const client = {
    loadingStatus: "Ready",
    getContext: () => context,
    updateUserAsync: vi.fn(),
    updateUserSync: vi.fn(),
  };
  return { useUser: vi.fn(), useStatsigClient: vi.fn(), client, context };
});

vi.mock("@clerk/nextjs", () => ({ useUser }));
vi.mock("@statsig/react-bindings", () => ({ useStatsigClient }));

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

function app(initialUserID = "user_ada") {
  return (
    <StatsigIdentitySync initialUserID={initialUserID}>
      <div>Gate consumer</div>
    </StatsigIdentitySync>
  );
}

beforeEach(() => {
  context.user = { userID: "user_ada" };
  client.loadingStatus = "Ready";
  useStatsigClient.mockReturnValue({ client, isLoading: false });
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

test("renders the server identity while Clerk loads", () => {
  useUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
  render(app());
  expect(screen.getByText("Gate consumer")).toBeInTheDocument();
  expect(client.updateUserAsync).not.toHaveBeenCalled();
});

test("uses only the Clerk ID and ignores email changes", async () => {
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_ada", "new@example.com");
  view.rerender(app());
  expect(client.updateUserAsync).not.toHaveBeenCalled();
  expect(context.user).toEqual({ userID: "user_ada" });
});

test("hides consumers until an account switch completes", async () => {
  const update = deferred();
  client.updateUserAsync.mockImplementationOnce((user: User) => {
    context.user = user;
    return update.promise;
  });
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser("user_grace");
  view.rerender(app());
  expect(screen.queryByText("Gate consumer")).toBeNull();
  expect(client.updateUserAsync).toHaveBeenCalledWith({ userID: "user_grace" });
  await act(async () => update.resolve());
  await screen.findByText("Gate consumer");
});

test("clears the user on sign-out", async () => {
  const view = render(app());
  await screen.findByText("Gate consumer");
  setClerkUser();
  view.rerender(app());
  await waitFor(() => expect(client.updateUserAsync).toHaveBeenCalledWith({}));
  await screen.findByText("Gate consumer");
  expect(context.user).toEqual({});
});

test("a late failed update cannot restore an earlier account", async () => {
  const earlier = deferred();
  client.updateUserAsync.mockImplementationOnce((user: User) => {
    context.user = user;
    return earlier.promise;
  });
  const view = render(app());
  setClerkUser("user_grace");
  view.rerender(app());
  setClerkUser("user_lin");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  await act(async () => earlier.reject(new Error("Offline")));
  expect(client.updateUserSync).not.toHaveBeenCalled();
  expect(context.user).toEqual({ userID: "user_lin" });
});

test("uses the current user's cached values after an update failure", async () => {
  client.updateUserAsync.mockRejectedValueOnce(new Error("Offline"));
  const view = render(app());
  setClerkUser("user_grace");
  view.rerender(app());
  await screen.findByText("Gate consumer");
  expect(client.updateUserSync).toHaveBeenCalledWith({ userID: "user_grace" });
});
