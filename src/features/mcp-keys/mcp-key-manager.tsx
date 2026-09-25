"use client";

import styles from "./mcp-keys.module.css";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { TextInput } from "@/components/ui/text-input";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { Stack } from "@/components/ui/stack";
import { createMcpKeyAction, type McpKeyFormState } from "./actions";

const initialState: McpKeyFormState = {};

export function McpKeyManager() {
  const [state, action, pending] = useActionState(createMcpKeyAction, initialState);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.secret) nameRef.current?.form?.reset();
  }, [state.secret]);

  return (
    <Card as="section" padding="large">
      <Stack gap="150">
        <Heading as="h2" level={3}>
          Create an MCP key
        </Heading>
        <Text as="p">
          Use this only when a client cannot connect through OAuth. Create a separate key for each
          client; the secret is shown only once.
        </Text>
        <Stack as="form" action={action} gap="100" className={styles.form}>
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
            <Text as="p" appearance="error" role="alert">
              {state.error}
            </Text>
          )}
          <Inline>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creating…" : "Create MCP key"}
            </Button>
          </Inline>
        </Stack>
        {state.secret && (
          <Stack gap="100" className={styles.secret} role="status">
            <Heading as="h3" level={5}>
              Save this key now
            </Heading>
            <Text as="p">{state.name} is ready. It will not be displayed again.</Text>
            <input aria-label="New MCP API key" readOnly value={state.secret} />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
