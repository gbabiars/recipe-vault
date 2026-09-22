import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppSidebar } from "./app-sidebar";

const meta = {
  title: "app/Navigation/Sidebar",
  component: AppSidebar,
  args: { pathname: "/recipes", onSignOut: () => {} },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recipes: Story = {};
export const RecipeDetail: Story = { args: { pathname: "/recipes/example" } };
export const Settings: Story = { args: { pathname: "/settings" } };
export const Profile: Story = { args: { pathname: "/user-profile" } };
export const McpKeys: Story = { args: { pathname: "/mcp-keys" } };
