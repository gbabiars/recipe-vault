import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";

export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <Heading>Settings</Heading>
        </div>
      </div>
      <div className="settings-links">
        <Card as="section" padding="large">
          <Heading as="h2" level={5}>
            <Link href="/user-profile">Profile</Link>
          </Heading>
          <p>Manage your account details.</p>
        </Card>
        <Card as="section" padding="large">
          <Heading as="h2" level={5}>
            <Link href="/mcp-keys">MCP keys</Link>
          </Heading>
          <p>Manage keys for MCP clients.</p>
        </Card>
      </div>
    </>
  );
}
