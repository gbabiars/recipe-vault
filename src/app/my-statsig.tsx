"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { StatsigProvider, useClientAsyncInit, type StatsigUser } from "@statsig/react-bindings";

const loading = <div>Loading...</div>;

function sameUser(left: StatsigUser | null, right: StatsigUser) {
  return left !== null && left.userID === right.userID && left.email === right.email;
}

export default function MyStatsig({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const userID = isSignedIn ? user.id : undefined;
  const email = isSignedIn ? user.primaryEmailAddress?.emailAddress : undefined;
  const statsigUser = useMemo(
    () => (userID ? { userID, ...(email ? { email } : {}) } : {}),
    [userID, email],
  );

  if (!isLoaded) return loading;

  return <ClerkStatsig user={statsigUser}>{children}</ClerkStatsig>;
}

function ClerkStatsig({ user, children }: { user: StatsigUser; children: ReactNode }) {
  const { client, isLoading } = useClientAsyncInit(
    "client-lbSTOqZvijeFQCH4ormCho4kfRDq2MF5fUMSBH1PBr0",
    user,
  );
  const [syncedUser, setSyncedUser] = useState<StatsigUser | null>(null);

  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;

    async function syncUser() {
      if (!sameUser(client.getContext().user, user)) {
        try {
          await client.updateUserAsync(user);
        } catch {
          if (cancelled) return;
          // Unexpected rejections still switch to this user's cache or closed gates.
          client.updateUserSync(user, { disableBackgroundCacheRefresh: true });
        }
      }

      if (!cancelled) {
        // The SDK can resolve a failed request without reaching Ready.
        if (client.loadingStatus !== "Ready") {
          client.updateUserSync(user, { disableBackgroundCacheRefresh: true });
        }
        setSyncedUser(user);
      }
    }

    void syncUser();
    return () => {
      cancelled = true;
    };
  }, [client, isLoading, user]);

  return (
    <StatsigProvider client={client} loadingComponent={loading}>
      {sameUser(syncedUser, user) && sameUser(client.getContext().user, user) ? children : loading}
    </StatsigProvider>
  );
}
