"use client";

import React from "react";
import { StatsigProvider, useClientAsyncInit } from "@statsig/react-bindings";

export default function MyStatsig({ children }: { children: React.ReactNode }) {
  const { client } = useClientAsyncInit("client-lbSTOqZvijeFQCH4ormCho4kfRDq2MF5fUMSBH1PBr0", {
    userID: "a-user",
  });

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      {children}
    </StatsigProvider>
  );
}
