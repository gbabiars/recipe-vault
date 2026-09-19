"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMcpKeyAction, type McpKeyFormState } from "./actions";

const initialState: McpKeyFormState = {};

export function McpKeyManager() {
  const [state, action, pending] = useActionState(createMcpKeyAction, initialState);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.secret) nameRef.current?.form?.reset();
  }, [state.secret]);

  return (
    <section className="mcp-key-panel">
      <h2>Create an MCP key</h2>
      <p>
        Use this only when a client cannot connect through OAuth. Create a separate key for each
        client; the secret is shown only once.
      </p>
      <form action={action} className="mcp-key-form">
        <label className="field">
          Key name
          <input ref={nameRef} name="name" maxLength={100} required placeholder="My MCP client" />
        </label>
        <fieldset>
          <legend>Permissions</legend>
          <label>
            <input type="radio" name="access" value="read" defaultChecked /> Read recipes
          </label>
          <label>
            <input type="radio" name="access" value="write" /> Read and save recipes
          </label>
        </fieldset>
        <fieldset>
          <legend>Expiration</legend>
          <label>
            <input type="radio" name="expiration" value="30" /> 30 days
          </label>
          <label>
            <input type="radio" name="expiration" value="90" defaultChecked /> 90 days
          </label>
          <label>
            <input type="radio" name="expiration" value="365" /> 1 year
          </label>
        </fieldset>
        {state.error && (
          <p className="field-error" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? "Creating…" : "Create MCP key"}
        </button>
      </form>
      {state.secret && (
        <div className="mcp-key-secret" role="status">
          <h3>Save this key now</h3>
          <p>{state.name} is ready. It will not be displayed again.</p>
          <input aria-label="New MCP API key" readOnly value={state.secret} />
        </div>
      )}
    </section>
  );
}
