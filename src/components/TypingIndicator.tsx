import { Bot } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex gap-4 px-4 md:px-6 py-4 bg-blue-50/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold shadow-sm">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-sm text-slate-600 mr-1">FeverEase is analyzing</span>
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500"></div>
      </div>
    </div>
  );
};
