import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, FileText, Mic, Users, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import type { Conversation } from "@/pages/Index";

interface ChatHeaderProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isSidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<void>;
  onDeleteAllConversations: () => Promise<void>;
  onNewChat: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onQuickAction: (message: string) => void;
}

const ChatHeader = ({
  conversations,
  currentConversationId,
  isSidebarOpen,
  onSidebarOpenChange,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  onNewChat,
  onSignOut,
  onQuickAction,
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <header className="border-b bg-gradient-to-r from-blue-50 to-slate-50 shadow-sm">
      <div className="flex h-auto flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button - Hidden on lg and up */}
          <Sheet open={isSidebarOpen} onOpenChange={onSidebarOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={(id) => {
                  onSelectConversation(id);
                  onSidebarOpenChange(false);
                }}
                onDeleteConversation={onDeleteConversation}
                onDeleteAllConversations={onDeleteAllConversations}
                onNewChat={onNewChat}
                onSignOut={onSignOut}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="FeverEase" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">FeverEase</h1>
                <p className="text-xs text-slate-500">AI Health Companion</p>
              </div>
            </div>

            {/* Quick Tools: horizontal on md+, dropdown on small screens */}
            <div className="ml-4 hidden md:flex items-center gap-2">
            </div>

            {/* Tools Dropdown - Mobile */}
            <div className="ml-2 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-3 py-1">
                    Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={8} className="w-56">
                  <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() =>
                      onQuickAction("I need information about medications and dosage")
                    }
                  >
                    💊 Medication Information
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      onQuickAction(
                        "What are some general health tips and preventive measures?"
                      )
                    }
                  >
                    🩺 Health & Prevention
                  </DropdownMenuItem>
                  {role === "patient" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigate("/doctors")}>
                        👨‍⚕️ Find Doctors
                      </DropdownMenuItem>
                    </>
                  )}
                  {role === "doctor" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigate("/doctor-requests")}>
                        📋 Patient Requests
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Report and Doctor Buttons */}
          <Button
            variant="outline"
            onClick={() => navigate("/report-diagnosis")}
            className="hidden sm:flex items-center gap-2 border-emerald-300 hover:bg-emerald-50"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Report Diagnosis</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/native-voice")}
            className="hidden sm:flex items-center gap-2 border-purple-300 hover:bg-purple-50"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden md:inline">Speak in Your Language</span>
          </Button>
          {/* Role-based navigation */}
          {role === "patient" && (
            <Button
              variant="outline"
              onClick={() => navigate("/doctors")}
              className="hidden sm:flex items-center gap-2 border-indigo-300 hover:bg-indigo-50"
            >
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Find Doctors</span>
            </Button>
          )}
          {role === "doctor" && (
            <Button
              variant="outline"
              onClick={() => navigate("/doctor-requests")}
              className="hidden sm:flex items-center gap-2 border-amber-300 hover:bg-amber-50"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden md:inline">Requests</span>
            </Button>
          )}

          {/* Mobile Icons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/report-diagnosis")}
            className="sm:hidden"
            title="Upload medical report"
          >
            <FileText className="h-5 w-5 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/native-voice")}
            className="sm:hidden"
            title="Speak in your language"
          >
            <Mic className="h-5 w-5 text-purple-600" />
          </Button>
          {role === "patient" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/doctors")}
              className="sm:hidden"
              title="Find doctors"
            >
              <Users className="h-5 w-5 text-indigo-600" />
            </Button>
          )}
          {role === "doctor" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/doctor-requests")}
              className="sm:hidden"
              title="Patient requests"
            >
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
