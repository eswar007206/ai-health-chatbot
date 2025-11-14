# Component Usage Guide

## Quick Reference

### For Developers
When you need to modify the chat interface, here's where to go:

| Change Needed | File |
|---------------|------|
| Chat conversation list styling | `LeftPanel.tsx` |
| Header buttons & navigation | `ChatHeader.tsx` |
| Message display & scrolling | `ChatMessages.tsx` |
| Business logic & API calls | `Index.tsx` |
| Message formatting | `ChatMessage.tsx` |
| Voice/Text input | `ChatInput.tsx` |

---

## LeftPanel.tsx Usage

### When to modify:
- Change sidebar colors/styling
- Modify conversation list layout
- Add new settings options
- Adjust spacing/padding
- Update delete confirmations

### Key Props:
```tsx
interface LeftPanelProps {
  conversations: Conversation[]        // List of all chats
  currentConversationId: string | null // Currently selected
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => Promise<void>
  onDeleteAllConversations: () => Promise<void>
  onNewChat: () => Promise<void>
  onSignOut: () => Promise<void>
}
```

### Example Usage:
```tsx
<LeftPanel
  conversations={conversations}
  currentConversationId={currentConversationId}
  onSelectConversation={(id) => {
    setCurrentConversationId(id);
    loadMessages(id);
  }}
  onDeleteConversation={handleDeleteConversation}
  onDeleteAllConversations={handleDeleteAllConversations}
  onNewChat={handleNewChat}
  onSignOut={handleSignOut}
/>
```

### CSS Classes to Customize:
```tsx
// Main container
"hidden lg:flex flex-col h-full w-64 border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm"

// Header
"p-4 border-b border-slate-100"

// Active conversation
"bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-300 shadow-sm"

// Inactive conversation hover
"hover:bg-slate-100 border border-transparent"
```

---

## ChatHeader.tsx Usage

### When to modify:
- Change quick access tools
- Add/remove navigation buttons
- Update dropdown menu options
- Modify header styling
- Change logo position

### Key Props:
```tsx
interface ChatHeaderProps {
  conversations: Conversation[]
  currentConversationId: string | null
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => Promise<void>
  onDeleteAllConversations: () => Promise<void>
  onNewChat: () => Promise<void>
  onSignOut: () => Promise<void>
  onQuickAction: (message: string) => void // Send predefined message
}
```

### Example: Adding a New Quick Tool
```tsx
// In ChatHeader.tsx, find the "Quick Tools" section
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      className="px-3 py-1 text-sm"
      onClick={() =>
        onQuickAction("Your custom message here")
      }
    >
      🆕 New Tool
    </Button>
  </TooltipTrigger>
  <TooltipContent>Tool description</TooltipContent>
</Tooltip>
```

### Responsive Classes:
```tsx
"hidden md:flex"    // Hidden on mobile, visible on md+
"md:hidden"         // Visible on mobile, hidden on md+
"hidden sm:flex"    // Hidden on very small, visible on sm+
"sm:hidden"         // Visible on very small, hidden on sm+
```

---

## ChatMessages.tsx Usage

### When to modify:
- Change message display styling
- Modify typing indicator behavior
- Update scroll behavior
- Change empty state (welcome screen)
- Adjust message spacing

### Key Props:
```tsx
interface ChatMessagesProps {
  messages: Message[]
  isTyping: boolean
  userName?: string
  onQuickAction: (message: string) => void
}
```

### Example Usage:
```tsx
<ChatMessages
  messages={messages}
  isTyping={isTyping}
  userName={user?.user_metadata?.full_name}
  onQuickAction={handleSendMessage}
/>
```

### Auto-scroll Implementation:
```tsx
// Already built-in using useRef and useEffect
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  scrollToBottom();
}, [messages, isTyping]);

// Scrolls automatically when new messages arrive
```

---

## Index.tsx Usage

### Main Functions to Know:

#### 1. `loadConversations(userId: string)`
```tsx
// Loads all conversations for a user from Supabase
await loadConversations(user.id);
```

#### 2. `loadMessages(conversationId: string)`
```tsx
// Loads all messages for a specific conversation
await loadMessages(currentConversationId);
```

#### 3. `createNewConversation(userId: string)`
```tsx
// Creates a new conversation and sets it as current
await createNewConversation(user.id);
```

#### 4. `streamAIResponse(userMessage: string)`
```tsx
// Sends message to backend and gets AI response
// Saves both to database
await streamAIResponse(userMessage);
```

#### 5. `handleSendMessage(content: string)`
```tsx
// User-facing handler that triggers everything
handleSendMessage("User's message here");
```

---

## Integration Example: Adding a New Feature

### Scenario: Add a "Health Tips" quick action

**Step 1: Update ChatHeader.tsx**
```tsx
// Add to "Quick Tools" section
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      className="px-3 py-1 text-sm"
      onClick={() =>
        onQuickAction("Give me some daily health tips")
      }
    >
      💡 Health Tips
    </Button>
  </TooltipTrigger>
  <TooltipContent>Get daily health recommendations</TooltipContent>
</Tooltip>
```

**Step 2: Update mobile Tools dropdown**
```tsx
// In DropdownMenuContent
<DropdownMenuItem
  onSelect={() =>
    onQuickAction("Give me some daily health tips")
  }
>
  💡 Health Tips
</DropdownMenuItem>
```

That's it! No changes needed elsewhere - the message flows through:
- `onQuickAction()` → `handleSendMessage()` → API → response

---

## Styling Deep Dive

### Color System

**Primary (Blue)**
```tailwindcss
border-blue-200/300
bg-blue-50/100
text-blue-600/700
hover:bg-blue-100
```

**Secondary (Emerald)**
```tailwindcss
border-emerald-200/300
bg-emerald-50/100
text-emerald-600/700
hover:bg-emerald-100
```

**Neutral (Slate)**
```tailwindcss
border-slate-200/300
bg-slate-50/100
text-slate-600/700/900
```

**Alert (Red)**
```tailwindcss
border-red-200/300
bg-red-50/100
text-red-600/700
hover:bg-red-50
```

### Animations
```tailwindcss
transition-all duration-200  // Smooth transitions
hover:scale-105             // Scale on hover
hover:shadow-md              // Shadow on hover
hover:bg-<color>-100        // Background change
opacity-0 group-hover:opacity-100  // Fade in on hover
```

---

## Common Customizations

### Change Sidebar Width
**File:** `LeftPanel.tsx`
```tsx
// Current: w-64 (256px)
// Change to: w-72 (288px) or w-80 (320px)
<div className="hidden lg:flex flex-col h-full w-64 ...">
                                           ^^^^
```

### Change Primary Color Scheme
**Files:** `LeftPanel.tsx`, `ChatHeader.tsx`
```tsx
// Search for "blue-" and replace with desired color
// Example: blue-500 → purple-500, green-500, etc.
```

### Add Conversation Search
**File:** `LeftPanel.tsx`
```tsx
// Add a search input after the header
const [searchQuery, setSearchQuery] = useState("");
const filteredConversations = conversations.filter(c =>
  c.title.toLowerCase().includes(searchQuery.toLowerCase())
);

// Then render filteredConversations instead of conversations
```

### Change Auto-scroll Behavior
**File:** `ChatMessages.tsx`
```tsx
// Current: smooth scroll
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

// Change to: instant scroll
messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
```

---

## Debugging Tips

### Messages Not Updating?
1. Check `handleSendMessage()` in Index.tsx
2. Verify `streamAIResponse()` is being called
3. Check network tab for API response

### Sidebar Not Showing?
1. Verify viewport is `lg+` (1024px+)
2. Check `hidden lg:flex` class is applied
3. Ensure `LeftPanel` is imported correctly

### Mobile Menu Not Working?
1. Check `isSidebarOpen` state in Index.tsx
2. Verify `Sheet` component is working
3. Ensure `onSidebarOpenChange` callback is passed

### Auto-scroll Not Working?
1. Verify `useRef` and `useEffect` in ChatMessages.tsx
2. Check `ref` is attached to scroll container
3. Ensure `messages` array is updating

---

## Performance Optimization

### For Large Conversation Lists
```tsx
// Add virtualization library (react-window)
import { FixedSizeList } from 'react-window';

// Wrap conversations in virtualized list
<FixedSizeList
  height={600}
  itemCount={conversations.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      {/* Render conversation item */}
    </div>
  )}
</FixedSizeList>
```

### For Long Message Lists
Already optimized with:
- ✅ Virtual scrolling (built-in browser)
- ✅ Ref-based scroll (no re-renders)
- ✅ Lazy loading (load as needed)

### Memoization
```tsx
// For ChatHeader if it receives many props
import { memo } from 'react';
export default memo(ChatHeader);
```

---

## Testing Guide

### Unit Testing LeftPanel
```tsx
import { render, screen } from '@testing-library/react';
import LeftPanel from '@/components/LeftPanel';

test('displays conversation list', () => {
  const props = {
    conversations: [{ id: '1', title: 'Test', created_at: '' }],
    currentConversationId: '1',
    // ... other props
  };
  render(<LeftPanel {...props} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Testing ChatMessages
```tsx
test('auto-scrolls to new messages', () => {
  const props = {
    messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: new Date() }],
    isTyping: false,
    onQuickAction: jest.fn(),
  };
  render(<ChatMessages {...props} />);
  // Verify scroll behavior
});
```

