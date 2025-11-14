import { cn } from "@/lib/utils";
import { Activity, Bot, User, CheckCircle2, AlertCircle } from "lucide-react";
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
        "flex gap-4 px-4 md:px-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
        isUser ? "bg-white" : isSystem ? "bg-amber-50 border-l-4 border-amber-400" : "bg-blue-50/50"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full font-semibold text-sm shadow-sm",
          isUser
            ? "bg-blue-600 text-white"
            : isSystem
            ? "bg-amber-500 text-white"
            : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
        )}
      >
        {isUser ? (
          <span className="text-xs font-bold">{userName?.[0]?.toUpperCase() || "U"}</span>
        ) : isSystem ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <FeverEaseAvatar />
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold leading-none text-slate-900">
            {isUser ? (userName || "You") : isSystem ? "System Alert" : "FeverEase"}
          </p>
          {timestamp && (
            <p className="text-xs text-slate-500">
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {isUser && <span className="text-xs text-slate-500 ml-auto"><CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-green-600" />Sent</span>}
        </div>
        <div className={cn(
          "prose prose-sm max-w-none text-slate-800 dark:prose-invert",
          isSystem && "text-amber-900"
        )}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="whitespace-pre-wrap my-1 leading-relaxed text-base">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="my-0 text-base">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
              code: ({ children }) => (
                <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg my-2 overflow-x-auto border border-slate-300">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-400 pl-4 italic text-slate-700 my-2">{children}</blockquote>
              ),
              h1: ({ children }) => <h1 className="text-lg font-bold my-2 text-slate-900">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold my-2 text-slate-900">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold my-1.5 text-slate-900">{children}</h3>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
