import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessageBubble } from "./chat-message-bubble";

const meta = {
  title: "App/Search/ChatMessageBubble",
  component: ChatMessageBubble,
  args: {
    message: "I have chicken, rice, and broccoli. What can I make for dinner?",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ChatMessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserInput: Story = {};
