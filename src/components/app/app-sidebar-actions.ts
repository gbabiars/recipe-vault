"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/require-user";
import {
  APP_SIDEBAR_PREFERENCE_COOKIE,
  getAppSidebarPreferenceCookieValue,
} from "./app-sidebar-preference";

export async function setAppSidebarCollapsed(collapsed: boolean) {
  if (typeof collapsed !== "boolean") {
    throw new TypeError("Sidebar preference must be a boolean.");
  }

  const user = await requireUser();
  const cookieStore = await cookies();

  cookieStore.set(
    APP_SIDEBAR_PREFERENCE_COOKIE,
    getAppSidebarPreferenceCookieValue(user.id, collapsed),
    {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}
