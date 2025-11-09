import { Bot } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex gap-3 px-4 py-6 bg-muted/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
      </div>
    </div>
  );
};
