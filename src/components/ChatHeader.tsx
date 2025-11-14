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
import { Menu, FileText, Stethoscope, AlertTriangle, Thermometer, Heart } from "lucide-react";
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-sm hover:bg-red-100 transition-all duration-200 flex items-center gap-1.5 font-medium"
                    onClick={() =>
                      onQuickAction(
                        "What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?"
                      )
                    }
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Emergency</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Emergency guide — use when immediate symptoms appear</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-sm hover:bg-orange-100 transition-all duration-200 flex items-center gap-1.5 font-medium"
                    onClick={() =>
                      onQuickAction("I want to check my symptoms and get medical advice")
                    }
                  >
                    <Thermometer className="h-4 w-4 text-orange-600" />
                    <span>Symptoms</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run a symptom assessment</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-sm hover:bg-green-100 transition-all duration-200 flex items-center gap-1.5 font-medium"
                    onClick={() =>
                      onQuickAction("I need information about medications and dosage")
                    }
                  >
                    <Heart className="h-4 w-4 text-green-600" />
                    <span>Follow ups</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Get medication and dosage guidance</TooltipContent>
              </Tooltip>
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
                      onQuickAction(
                        "What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?"
                      )
                    }
                  >
                    🚨 Emergency Guide
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate("/doctor")}>
                    👩‍⚕️ Doctor Consultation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      onQuickAction("I want to check my symptoms and get medical advice")
                    }
                  >
                    🌡️ Symptom Assessment
                  </DropdownMenuItem>
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
                  <DropdownMenuItem
                    onSelect={() =>
                      onQuickAction("When should I follow up with a healthcare provider?")
                    }
                  >
                    ⏱️ Follow-up Guidance
                  </DropdownMenuItem>
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
            onClick={() => navigate("/doctor")}
            className="hidden sm:flex items-center gap-2 border-blue-300 hover:bg-blue-50"
          >
            <Stethoscope className="h-4 w-4" />
            <span className="hidden md:inline">Consult Doctor</span>
          </Button>

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
            onClick={() => navigate("/doctor")}
            className="sm:hidden"
            title="Consult with a doctor"
          >
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
