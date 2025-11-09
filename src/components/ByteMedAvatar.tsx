import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export function ByteMedAvatar() {
  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src="/favicon.ico" alt="ByteMed" />
      <AvatarFallback>
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  )
}