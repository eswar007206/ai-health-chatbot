import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, LogOut, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  created_at: string;
  title: string;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations: () => void;
  onNewChat: () => void;
  onSignOut: () => void;
  className?: string;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  onNewChat,
  onSignOut,
  className,
}: SidebarProps) {
  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 space-y-2">
          <Button variant="default" className="w-full justify-start" onClick={onNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
          {conversations.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" 
              onClick={onDeleteAllConversations}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete all chats
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
        <div className="px-3">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Conversations
          </h2>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="relative group flex items-center"
                >
                  <Button
                    variant={
                      conversation.id === currentConversationId
                        ? "secondary"
                        : "ghost"
                    }
                    className="w-full justify-start font-normal"
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {conversation.title}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteConversation(conversation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}