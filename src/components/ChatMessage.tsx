import { cn } from "@/lib/utils";
import { Activity, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FeverEaseAvatar } from "./FeverEaseAvatar";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  userName?: string;
}

export const ChatMessage = ({ role, content, timestamp, userName }: ChatMessageProps) => {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
        isUser ? "bg-background" : "bg-muted/30"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg",
          isUser
            ? "bg-chat-user text-chat-user-foreground"
            : isSystem
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isSystem ? (
          <Activity className="h-4 w-4" />
        ) : (
          <FeverEaseAvatar />
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold leading-none">
            {isUser ? (userName || "You") : isSystem ? "System" : "FeverEase"}
          </p>
          {timestamp && (
            <p className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 my-2">{children}</ol>,
              li: ({ children }) => <li className="my-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-2 rounded my-2 overflow-x-auto">{children}</pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
