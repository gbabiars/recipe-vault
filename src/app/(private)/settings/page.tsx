import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
        </div>
      </div>
      <div className="settings-links">
        <Card as="section" padding="large">
          <h2>
            <Link href="/user-profile">Profile</Link>
          </h2>
          <p>Manage your account details.</p>
        </Card>
        <Card as="section" padding="large">
          <h2>
            <Link href="/mcp-keys">MCP keys</Link>
          </h2>
          <p>Manage keys for MCP clients.</p>
        </Card>
      </div>
    </>
  );
}
