import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export function FeverEaseAvatar() {
  return (
    <Avatar className="h-16 w-16">
      <AvatarImage src="/logo.png" alt="FeverEase" className="p-2" />
      <AvatarFallback>
        <Bot className="h-8 w-8" />
      </AvatarFallback>
    </Avatar>
  )
}