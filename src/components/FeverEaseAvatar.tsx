import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export function FeverEaseAvatar() {
  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src="/logo.png" alt="FeverEase" className="p-1" />
      <AvatarFallback>
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  )
}