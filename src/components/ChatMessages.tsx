import { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import type { Message } from "@/pages/Index";

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  userName?: string;
  onQuickAction: (message: string) => void;
}

const ChatMessages = ({ messages, isTyping, userName, onQuickAction }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
      {messages.length === 0 ? (
        <WelcomeScreen onQuickAction={onQuickAction} />
      ) : (
        <div className="mx-auto max-w-4xl">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className="text-sm font-medium text-slate-700">Consultation in Progress</p>
            </div>
          </div>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              userName={userName}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
