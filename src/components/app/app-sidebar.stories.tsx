import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { avatarImageFixtureUrl as profileImageFixtureUrl } from "../ui/avatar/avatar-image-fixture";
import { AppSidebar } from "./app-sidebar";

const meta = {
  title: "app/Navigation/Sidebar",
  component: AppSidebar,
  args: {
    pathname: "/recipes",
    userName: "Ada Lovelace",
    onSignOut: () => {},
    onToggleCollapse: () => {},
  },
  globals: { viewport: { value: "responsive", isRotated: false } },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recipes: Story = {};
export const RecipeDetail: Story = { args: { pathname: "/recipes/example" } };
export const Tags: Story = { args: { pathname: "/tags" } };
export const Settings: Story = { args: { pathname: "/settings" } };
export const Profile: Story = { args: { pathname: "/user-profile" } };
export const ProfileWithImage: Story = {
  args: { pathname: "/user-profile", userImageUrl: profileImageFixtureUrl },
};
export const Collapsed: Story = {
  args: { collapsed: true, onToggleCollapse: () => {} },
};
