# Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        FeverEase Chat Interface                     │
│                                                                     │
│  ┌───────────────────┐  ┌─────────────────────────────────────┐   │
│  │  LeftPanel.tsx    │  │                                     │   │
│  │  (Desktop Only)   │  │        Main Content Area            │   │
│  │                   │  │                                     │   │
│  │  ┌─────────────┐  │  │  ┌─────────────────────────────┐   │   │
│  │  │  FeverEase  │  │  │  │    ChatHeader.tsx           │   │   │
│  │  │   Logo      │  │  │  │  ┌──────────────────────┐   │   │   │
│  │  ├─────────────┤  │  │  │  │ Logo & Branding      │   │   │   │
│  │  │ + New Chat  │  │  │  │  ├──────────────────────┤   │   │   │
│  │  ├─────────────┤  │  │  │  │ Quick Tools (md+)    │   │   │   │
│  │  │             │  │  │  │  ├──────────────────────┤   │   │   │
│  │  │ Chats List  │  │  │  │  │ Report & Doctor Btn  │   │   │   │
│  │  │ (Scrollable)│  │  │  │  │ Mobile Menu (lg:h)   │   │   │   │
│  │  │             │  │  │  │  └──────────────────────┘   │   │   │
│  │  │ • Chat 1    │  │  │  └─────────────────────────────┘   │   │
│  │  │ • Chat 2 ▶  │  │  │  ┌─────────────────────────────┐   │   │
│  │  │ • Chat 3    │  │  │  │    ChatMessages.tsx         │   │   │
│  │  │             │  │  │  │  ┌──────────────────────┐   │   │   │
│  │  │ [hover🗑]   │  │  │  │  │ Welcome Screen       │   │   │   │
│  │  │             │  │  │  │  │      OR              │   │   │   │
│  │  ├─────────────┤  │  │  │  │ Message List         │   │   │   │
│  │  │⚙ More...   │  │  │  │  │ (Auto-scrolling)     │   │   │   │
│  │  │📋 Delete All│  │  │  │  │      +               │   │   │   │
│  │  │─────────────│  │  │  │  │ Typing Indicator     │   │   │   │
│  │  │🚪 Sign Out  │  │  │  │  └──────────────────────┘   │   │   │
│  │  └─────────────┘  │  │  └─────────────────────────────┘   │   │
│  │                   │  │  ┌─────────────────────────────┐   │   │
│  │  hidden lg:flex   │  │  │    ChatInput.tsx            │   │   │
│  │  w-64 border-r    │  │  │  ┌──────────────────────┐   │   │   │
│  │                   │  │  │  │ 🎤 Voice Input       │   │   │   │
│  │                   │  │  │  │ 📝 Text Input        │   │   │   │
│  │                   │  │  │  │ ➤ Send Button        │   │   │   │
│  │                   │  │  │  └──────────────────────┘   │   │   │
│  │                   │  │  └─────────────────────────────┘   │   │
│  └───────────────────┘  └─────────────────────────────────────┘   │
│                                                                     │
│  flex h-screen flex-row (Desktop: 2-column, Mobile: 1-column)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘


Responsive Breakpoints:
─────────────────────────

Mobile (< md):
┌─────────────────┐
│ 📋 (Menu Drawer)│  ← LeftPanel in Drawer
├─────────────────┤
│  ChatHeader     │  ← Mobile-optimized
├─────────────────┤
│  ChatMessages   │
├─────────────────┤
│  ChatInput      │
└─────────────────┘

Tablet (md - lg):
┌─────────────────────────┐
│  ChatHeader (md:flex)   │
├─────────────────────────┤
│     ChatMessages        │
├─────────────────────────┤
│     ChatInput           │
└─────────────────────────┘
(LeftPanel hidden)

Desktop (lg+):
┌──────────┬──────────────┐
│LeftPanel │ ChatHeader   │
│          ├──────────────┤
│ hidden   │ ChatMessages │
│ lg:flex  ├──────────────┤
│          │ ChatInput    │
└──────────┴──────────────┘
(Both LeftPanel and proper layout visible)


Data Flow:
──────────

Index.tsx (Logic & State)
    │
    ├─→ setMessages()
    ├─→ setConversations()
    ├─→ handleSendMessage()
    ├─→ loadMessages()
    └─→ createNewConversation()
         │
         ├─→ LeftPanel (Props: conversations, callbacks)
         │   └─→ onSelectConversation
         │   └─→ onDeleteConversation
         │   └─→ onNewChat
         │   └─→ onSignOut
         │
         ├─→ ChatHeader (Props: conversations, callbacks)
         │   └─→ Quick actions
         │   └─→ Mobile drawer
         │   └─→ Navigation
         │
         ├─→ ChatMessages (Props: messages, isTyping)
         │   └─→ Display messages
         │
         └─→ ChatInput (Props: onSendMessage)
             └─→ handleSendMessage()


Color Scheme:
─────────────

LeftPanel:
  • Background: Gradient slate-50 to white
  • Active Chat: Blue gradient bg-gradient-to-r from-blue-100 to-blue-50
  • Border: slate-200
  • Icons: Blue on active, slate-500 on inactive

ChatHeader:
  • Background: Gradient from-blue-50 to-slate-50
  • Buttons: Various (blue, emerald, ghost)
  • Shadow: shadow-sm

ChatMessages:
  • Background: Gradient from-white to-slate-50
  • Status bar: Green dot indicator
  • Messages: Alternating styles

Professional Features:
─────────────────────
✨ Smooth transitions (duration-200)
✨ Hover effects (scale-105, shadow-md)
✨ Gradient backgrounds
✨ Icon integration (lucide-react)
✨ Responsive design
✨ Professional typography
✨ Accessibility with tooltips
```

## Component Responsibilities

### 1. LeftPanel.tsx
```
Responsibilities:
├─ Display conversation history
├─ Show active conversation
├─ New chat creation
├─ Delete individual conversations
├─ Delete all conversations
├─ Settings menu
└─ Sign out functionality

Visual Hierarchy:
├─ Logo (Top)
├─ New Chat Button (Primary action)
├─ Conversation List (Main content)
├─ Settings & Sign Out (Bottom)
└─ All within desktop breakpoint (lg+)
```

### 2. ChatHeader.tsx
```
Responsibilities:
├─ Display branding & logo
├─ Quick access tools
├─ Navigation buttons
├─ Mobile drawer menu
├─ Report & Doctor buttons
└─ Mobile responsiveness

Breakpoints:
├─ md: Tools visible horizontally
├─ md-: Tools in dropdown
└─ lg: Hidden on desktop (LeftPanel sidebar)
```

### 3. ChatMessages.tsx
```
Responsibilities:
├─ Display welcome screen (empty state)
├─ Render message list
├─ Show typing indicator
├─ Auto-scroll to bottom
└─ Format timestamps

Features:
├─ Consultation status bar
├─ Message role styling
├─ Smooth scrolling behavior
└─ Responsive max-width
```

### 4. Index.tsx
```
Responsibilities:
├─ Auth management (Supabase)
├─ Conversation CRUD operations
├─ Message management
├─ API communication
├─ State orchestration
└─ Component composition

Business Logic:
├─ loadConversations()
├─ loadMessages()
├─ createNewConversation()
├─ streamAIResponse()
├─ handleSendMessage()
├─ handleDeleteConversation()
└─ handleSignOut()
```

