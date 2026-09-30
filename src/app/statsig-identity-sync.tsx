"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useStatsigClient, type StatsigUser } from "@statsig/react-bindings";

const loading = <div>Loading...</div>;

function sameUser(left: StatsigUser, right: StatsigUser) {
  return left.userID === right.userID;
}

export default function StatsigIdentitySync({
  initialUserID,
  children,
}: {
  initialUserID: string;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const userID = isLoaded ? (isSignedIn ? user.id : undefined) : initialUserID;
  const statsigUser = useMemo(() => (userID ? { userID } : {}), [userID]);
  const { client, isLoading } = useStatsigClient();
  const [syncedUser, setSyncedUser] = useState<StatsigUser>({ userID: initialUserID });

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    let cancelled = false;

    async function syncUser() {
      if (!sameUser(client.getContext().user, statsigUser)) {
        try {
          await client.updateUserAsync(statsigUser);
        } catch {
          if (cancelled) return;
          client.updateUserSync(statsigUser);
        }
      }

      if (!cancelled) {
        if (client.loadingStatus !== "Ready") {
          client.updateUserSync(statsigUser);
        }
        setSyncedUser(statsigUser);
      }
    }

    void syncUser();
    return () => {
      cancelled = true;
    };
  }, [client, isLoaded, isLoading, statsigUser]);

  return !isLoading &&
    sameUser(syncedUser, statsigUser) &&
    sameUser(client.getContext().user, statsigUser)
    ? children
    : loading;
}
