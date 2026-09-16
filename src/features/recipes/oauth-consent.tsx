"use client";

import { useEffect, useState } from "react";
import type { OAuthAuthorizationDetails } from "@supabase/auth-js";
import { getBrowserSupabaseClient } from "@/lib/auth/browser";

type Props = { authorizationId: string };

export function OAuthConsent({ authorizationId }: Props) {
  const [details, setDetails] = useState<OAuthAuthorizationDetails>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void getBrowserSupabaseClient()
      .auth.oauth.getAuthorizationDetails(authorizationId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) return setMessage("This authorization request is unavailable.");
        if ("redirect_url" in data) {
          window.location.assign(data.redirect_url);
          return;
        }
        setDetails(data);
      });
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(action: "approve" | "deny") {
    setPending(true);
    setMessage(undefined);
    const client = getBrowserSupabaseClient();
    const result =
      action === "approve"
        ? await client.auth.oauth.approveAuthorization(authorizationId, {
            skipBrowserRedirect: true,
          })
        : await client.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (result.error || !result.data?.redirect_url) {
      setMessage("Unable to complete this authorization request.");
      setPending(false);
      return;
    }
    window.location.assign(result.data.redirect_url);
  }

  if (message) return <p className="error-panel">{message}</p>;
  if (!details) return <p className="auth-card">Loading authorization request…</p>;
  return (
    <section className="auth-card">
      <p className="eyebrow">Authorize MCP client</p>
      <h1>{details.client.name || "Unknown application"}</h1>
      <p>
        This client is requesting access to your private Recipe Vault as your signed-in account.
      </p>
      <p>
        <strong>Requested information:</strong>{" "}
        {details.scope || "No profile information requested"}
      </p>
      {details.client.uri && <p>Client website: {details.client.uri}</p>}
      <div className="consent-actions">
        <button
          className="primary-button"
          disabled={pending}
          onClick={() => void decide("approve")}
        >
          Approve
        </button>
        <button className="danger-button" disabled={pending} onClick={() => void decide("deny")}>
          Deny
        </button>
      </div>
    </section>
  );
}
