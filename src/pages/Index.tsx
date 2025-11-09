import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ENDPOINTS } from "@/config/api";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Auth } from "@/components/Auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus, LogOut, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/Sidebar";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  created_at: string;
  title: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadConversations(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadConversations(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load all conversations for the user
  const loadConversations = async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      return;
    }

    setConversations(data || []);
    
    // Load the most recent conversation or create a new one
    if (data && data.length > 0) {
      setCurrentConversationId(data[0].id);
      loadMessages(data[0].id);
    } else {
      createNewConversation(userId);
    }
  };

  // Load messages for a specific conversation
  const loadMessages = async (conversationId: string) => {
    // Clear existing messages first
    setMessages([]);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      return;
    }

    setMessages(data?.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      timestamp: new Date(msg.created_at),
    })) || []);
  };

  const createNewConversation = async (userId: string) => {
    const title = "New Chat";
    const { data, error } = await supabase
      .from('conversations')
      .insert({ 
        user_id: userId,
        title: title 
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return;
    }

    setCurrentConversationId(data.id);
    setMessages([]);
    
    // Update conversations list
    setConversations(prev => [{
      id: data.id,
      title: title,
      created_at: data.created_at
    }, ...prev]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const streamAIResponse = async (userMessage: string) => {
    if (!currentConversationId || !user) return;

    setIsTyping(true);

    try {
      // Save user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: userMessage,
        });

      if (userMsgError) throw userMsgError;

      const response = await fetch(ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Add assistant response to messages
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantMessage.content,
      });

      setIsTyping(false);
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    streamAIResponse(content);
  };

  const handleNewChat = async () => {
    if (!user) return;
    
    // Clear messages immediately
    setMessages([]);
    
    await createNewConversation(user.id);
    await loadConversations(user.id);
    toast({
      title: "New conversation started",
      description: "Previous chat history has been cleared.",
    });
  };

  const handleDeleteAllConversations = async () => {
    if (!user) return;

    try {
      setMessages([]);
      setCurrentConversationId(null);

      // Delete all messages for this user's conversations
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversations.map(conv => conv.id));

      if (messagesError) throw messagesError;

      // Delete all conversations for this user
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (conversationsError) throw conversationsError;

      setConversations([]);
      
      toast({
        title: "Success",
        description: "All conversations deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting all conversations:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversations",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!user) return;

    try {
      // Clear messages immediately from UI if we're deleting current conversation
      if (currentConversationId === id) {
        setMessages([]);
        setCurrentConversationId(null);
      }

      // Delete all messages first
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      if (messagesError) throw messagesError;

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (conversationError) throw conversationError;

      // Update local state
      setConversations(prev => prev.filter(conv => conv.id !== id));

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMessages([]);
    setCurrentConversationId(null);
    setConversations([]);
    setIsSidebarOpen(false);
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center gap-4 px-4">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={(id) => {
                  setCurrentConversationId(id);
                  loadMessages(id);
                  setIsSidebarOpen(false);
                }}
                onDeleteConversation={handleDeleteConversation}
                onDeleteAllConversations={handleDeleteAllConversations}
                onNewChat={handleNewChat}
                onSignOut={handleSignOut}
              />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="FeverEase" className="h-16 w-16 object-contain" />
              <h1 className="text-2xl font-semibold">FeverEase</h1>
            </div>
            <Button 
              variant="secondary"
              onClick={() => navigate('/doctor')}
              className="hidden sm:flex items-center gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              Doctor Consultation
            </Button>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onQuickAction={handleSendMessage} />
        ) : (
          <div className="mx-auto max-w-4xl">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                userName={user?.user_metadata?.full_name}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
};

export default Index;
