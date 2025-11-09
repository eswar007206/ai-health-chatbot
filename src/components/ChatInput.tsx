import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-4xl gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your symptoms... (Press Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          className="min-h-[60px] max-h-[200px] resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};
