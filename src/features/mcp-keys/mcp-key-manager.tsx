"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { createMcpKeyAction, type McpKeyFormState } from "./actions";

const initialState: McpKeyFormState = {};

export function McpKeyManager() {
  const [state, action, pending] = useActionState(createMcpKeyAction, initialState);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.secret) nameRef.current?.form?.reset();
  }, [state.secret]);

  return (
    <Card as="section" className="mcp-key-section" padding="large">
      <Heading as="h2" level={3}>
        Create an MCP key
      </Heading>
      <p>
        Use this only when a client cannot connect through OAuth. Create a separate key for each
        client; the secret is shown only once.
      </p>
      <form action={action} className="mcp-key-form">
        <Field name="name">
          <FieldLabel>Key name</FieldLabel>
          <Input ref={nameRef} maxLength={100} required placeholder="My MCP client" />
        </Field>
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
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create MCP key"}
        </Button>
      </form>
      {state.secret && (
        <div className="mcp-key-secret" role="status">
          <Heading as="h3" level={5}>
            Save this key now
          </Heading>
          <p>{state.name} is ready. It will not be displayed again.</p>
          <input aria-label="New MCP API key" readOnly value={state.secret} />
        </div>
      )}
    </Card>
  );
}
