"use client";

import styles from "./mcp-keys.module.css";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { TextInput } from "@/components/ui/text-input";
import { Inline } from "@/components/ui/inline";
import { createMcpKeyAction, type McpKeyFormState } from "./actions";

const initialState: McpKeyFormState = {};

export function McpKeyManager() {
  const [state, action, pending] = useActionState(createMcpKeyAction, initialState);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.secret) nameRef.current?.form?.reset();
  }, [state.secret]);

  return (
    <Card as="section" className={styles.section} padding="large">
      <Heading as="h2" level={3}>
        Create an MCP key
      </Heading>
      <p>
        Use this only when a client cannot connect through OAuth. Create a separate key for each
        client; the secret is shown only once.
      </p>
      <form action={action} className={styles.form}>
        <TextInput
          ref={nameRef}
          name="name"
          label="Key name"
          maxLength={100}
          required
          placeholder="My MCP client"
        />
        <RadioGroup label="Permissions" name="access" defaultValue="read">
          <RadioGroupItem value="read" label="Read recipes" />
          <RadioGroupItem value="write" label="Read and save recipes" />
        </RadioGroup>
        <RadioGroup label="Expiration" name="expiration" defaultValue="90">
          <RadioGroupItem value="30" label="30 days" />
          <RadioGroupItem value="90" label="90 days" />
          <RadioGroupItem value="365" label="1 year" />
        </RadioGroup>
        {state.error && (
          <p className={styles.fieldError} role="alert">
            {state.error}
          </p>
        )}
        <Inline>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create MCP key"}
          </Button>
        </Inline>
      </form>
      {state.secret && (
        <div className={styles.secret} role="status">
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
