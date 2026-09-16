type OAuthJwtClaims = {
  iss?: string;
  aud?: string | string[];
  client_id?: unknown;
};

/** Keeps OAuth claim policy separate from transport and recipe-domain code. */
export function acceptsMcpOAuthClaims(
  claims: OAuthJwtClaims | null,
  supabaseUrl: string,
  trustedClientId: string,
) {
  const audience = claims?.aud;
  return (
    claims?.iss === `${supabaseUrl.replace(/\/$/, "")}/auth/v1` &&
    (audience === "authenticated" ||
      (Array.isArray(audience) && audience.includes("authenticated"))) &&
    claims.client_id === trustedClientId
  );
}
