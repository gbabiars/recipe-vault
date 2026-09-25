import styles from "./page.module.css";
import headingStyles from "../page-heading.module.css";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";

export default function SettingsPage() {
  return (
    <>
      <div className={headingStyles.pageHeading}>
        <div>
          <Heading>Settings</Heading>
        </div>
      </div>
      <div className={styles.settingsLinks}>
        <Card as="section" label="Profile" render={<Link href="/user-profile" />}>
          <Heading as="h2" level={5}>
            Profile
          </Heading>
          <p>Manage your account details.</p>
        </Card>
        <Card as="section" label="MCP keys" render={<Link href="/mcp-keys" />}>
          <Heading as="h2" level={5}>
            MCP keys
          </Heading>
          <p>Manage keys for MCP clients.</p>
        </Card>
      </div>
    </>
  );
}
