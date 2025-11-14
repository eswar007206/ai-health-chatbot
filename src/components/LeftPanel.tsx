import { Button } from "@/components/ui/button";
import { LogOut, Plus, Trash2, MessageSquare } from "lucide-react";
import { Conversation } from "@/pages/Index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LeftPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<void>;
  onDeleteAllConversations: () => Promise<void>;
  onNewChat: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

const LeftPanel = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  onNewChat,
  onSignOut,
}: LeftPanelProps) => {
  return (
    <div className="hidden lg:flex flex-col h-full w-64 border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <Button
          onClick={onNewChat}
          className="w-full border-2 border-slate-900 bg-white text-slate-900 hover:border-slate-900 hover:bg-slate-900 hover:text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-2">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">No conversations</p>
              <p className="text-xs text-slate-400 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all duration-300 border-2",
                  currentConversationId === conversation.id
                    ? "bg-slate-900 border-slate-900 shadow-md text-white"
                    : "bg-white border-slate-900 hover:bg-slate-900 hover:text-white"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    currentConversationId === conversation.id
                      ? "text-white"
                      : "text-slate-700 group-hover:text-white"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate transition-colors",
                      currentConversationId === conversation.id
                        ? "text-white"
                        : "text-slate-700 group-hover:text-white"
                    )}
                  >
                    {conversation.title}
                  </p>
                  <p className={cn("text-xs truncate transition-colors", currentConversationId === conversation.id ? "text-gray-300" : "text-slate-500 group-hover:text-gray-300")}>
                    {new Date(conversation.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Delete Button - appears on hover */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-7 w-7 p-0 hover:bg-red-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? This conversation will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteConversation(conversation.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Delete All and Sign Out */}
      <div className="border-t border-slate-100 p-3 space-y-2 bg-gradient-to-t from-white to-transparent">
        {/* Delete All Conversations Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete All Chats</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Conversations</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your conversations and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteAllConversations()}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>

        {/* Sign Out Button */}
        <Button
          onClick={onSignOut}
          variant="ghost"
          className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default LeftPanel;
