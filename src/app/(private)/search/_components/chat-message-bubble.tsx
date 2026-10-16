import { Text } from "@/components/ui/text";
import styles from "./chat-message-bubble.module.css";

export function ChatMessageBubble({ message }: { message: string }) {
  return (
    <div className={styles.row}>
      <div className={styles.bubble}>
        <Text as="p" className={styles.message}>
          {message}
        </Text>
      </div>
    </div>
  );
}
