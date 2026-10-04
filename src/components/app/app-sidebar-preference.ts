export const APP_SIDEBAR_PREFERENCE_COOKIE = "recipe-vault-sidebar";

export function getAppSidebarPreferenceCookieValue(userId: string, collapsed: boolean) {
  return `${userId}:${collapsed ? "collapsed" : "expanded"}`;
}

export function isAppSidebarCollapsedForUser(cookieValue: string | undefined, userId: string) {
  return cookieValue === getAppSidebarPreferenceCookieValue(userId, true);
}
