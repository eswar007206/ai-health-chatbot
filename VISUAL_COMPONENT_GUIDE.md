# 🎨 Visual Component Guide

## Desktop View (lg+)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────────────────┐  ┌─────────────────────────────────┐   │
│  │  LeftPanel     │  │       ChatHeader                │   │
│  │                │  │  Logo | Tools | Report | Doctor │   │
│  │  FeverEase     │  └─────────────────────────────────┘   │
│  │  ──────────    │  ┌─────────────────────────────────┐   │
│  │  ➕ New Chat   │  │                                 │   │
│  │  ──────────    │  │       ChatMessages              │   │
│  │                │  │                                 │   │
│  │ • Chat 1       │  │  [Message History]              │   │
│  │ • Chat 2 ←──── │  │  [Current Conversation]         │   │
│  │ • Chat 3       │  │  [Typing Indicator...]          │   │
│  │ • Chat 4       │  │                                 │   │
│  │ • Chat 5       │  │                                 │   │
│  │                │  │                                 │   │
│  │ [hover🗑]      │  ├─────────────────────────────────┤   │
│  │ ──────────    │  │                                 │   │
│  │ ⚙️ More...    │  │      ChatInput                  │   │
│  │ 🚪 Sign Out    │  │  🎤 | Input Box | ➤           │   │
│  │                │  └─────────────────────────────────┘   │
│  └────────────────┘  │◀────── flex: 1 (fills space) ────►│
│   w-64 (fixed)       └─────────────────────────────────────┘
└──────────────────────────────────────────────────────────────┘
```

---

## Tablet View (md-lg)

```
┌──────────────────────────────────────┐
│                                      │
│       ☰ ChatHeader                  │
│  Logo | Tools | Report | Doctor     │
│                                      │
├──────────────────────────────────────┤
│                                      │
│       ChatMessages                   │
│  [Full Width Message Area]          │
│  [Auto-scroll]                      │
│                                      │
├──────────────────────────────────────┤
│                                      │
│       ChatInput                      │
│  🎤 | Input | ➤                    │
│                                      │
└──────────────────────────────────────┘

LeftPanel: Hidden
Header: Drawer menu available (☰)
Layout: Single column
```

---

## Mobile View (< md)

```
┌─────────────────────┐
│ ☰                   │  ← Hamburger opens drawer
│ ChatHeader          │
│ Logo | Tools (dd)   │
├─────────────────────┤
│                     │
│  ChatMessages       │
│  [Compact Layout]   │
│  [Stack Vertical]   │
│                     │
├─────────────────────┤
│                     │
│  ChatInput          │
│  🎤 | Input | ➤    │
│                     │
└─────────────────────┘

When drawer open (☰):
┌─────────────────────┐
│ LeftPanel (Drawer)  │
│ • Conversations     │
│ • Settings          │
│ • Sign Out          │
└─────────────────────┘
```

---

## Color Palette Reference

### Primary Theme (Blue)
```
Palette:
├─ bg-blue-50 (Lightest - backgrounds)
├─ bg-blue-100 (Light - active state)
├─ border-blue-200 (Border color)
├─ border-blue-300 (Active border)
├─ text-blue-600 (Icon color)
├─ text-blue-700 (Text color)
├─ bg-blue-500/600 (Buttons)
└─ hover:bg-blue-100 (Hover state)

Used in:
• LeftPanel active conversation
• ChatHeader primary buttons
• "New Chat" button
• Active state indicators
```

### Secondary Theme (Emerald)
```
Palette:
├─ bg-emerald-50 (Lightest)
├─ border-emerald-200/300 (Borders)
├─ text-emerald-600/700 (Text)
├─ hover:bg-emerald-50 (Hover)

Used in:
• Report Diagnosis button
• Medical-related UI elements
```

### Neutral Theme (Slate)
```
Palette:
├─ bg-slate-50 (Lightest - backgrounds)
├─ bg-white (Pure white)
├─ border-slate-200 (Default borders)
├─ text-slate-500 (Subtle text)
├─ text-slate-600/700 (Main text)
├─ text-slate-900 (Headings)
└─ hover:bg-slate-100 (Hover)

Used in:
• Default backgrounds
• Text colors
• Borders
• Neutral elements
```

### Alert Theme (Red)
```
Palette:
├─ text-red-500/600 (Icons)
├─ text-red-600/700 (Text)
├─ bg-red-50 (Hover background)
├─ hover:bg-red-50 (Hover state)
└─ bg-red-500/600 (Delete buttons)

Used in:
• Delete buttons
• Delete confirmations
• Warning states
```

---

## Component Spacing Reference

### LeftPanel Spacing
```
Header:
├─ p-4 (Padding all sides)
├─ mb-4 (Margin bottom for logo)
└─ gap-2 (Gap between logo elements)

Content:
├─ p-3 (Padding)
├─ space-y-2 (Vertical spacing between items)
└─ p-3 (Item padding)

Footer:
├─ border-t (Top border)
├─ p-3 (Padding)
└─ space-y-2 (Button spacing)
```

### ChatHeader Spacing
```
Container:
├─ gap-3 (Gap between rows)
├─ px-4 (Horizontal padding)
├─ py-4 (Vertical padding)

Items:
├─ gap-2 (Item spacing)
├─ gap-4 (Section spacing)
└─ ml-auto (Push to right)
```

### ChatMessages Spacing
```
Container:
├─ max-w-4xl (Max width constraint)
├─ p-6 (Padding)

Status Bar:
├─ px-6 (Horizontal padding)
├─ py-3 (Vertical padding)
├─ gap-2 (Icon + text spacing)
└─ border-b (Bottom border)
```

---

## Typography Reference

### Headings
```
h1: text-xl font-bold (Logo)
h2: text-lg font-bold (Section titles)
p: text-sm font-medium (Main text)
span: text-xs (Metadata)
```

### Text Colors
```
Primary text: text-slate-900
Secondary text: text-slate-700
Tertiary text: text-slate-500
Subtle text: text-slate-400
Active text: text-blue-900
Danger text: text-red-600
```

### Font Weights
```
Regular: font-normal (400)
Medium: font-medium (500)
Semibold: font-semibold (600)
Bold: font-bold (700)
```

---

## Animation Effects

### Transitions
```
Standard: transition-all duration-200
Used for: Hover effects, color changes, scaling

Specific:
├─ transition-opacity (Fade in/out)
├─ transition-colors (Color changes)
├─ transition-transform (Scale/position)
└─ transition-shadow (Shadow changes)
```

### Hover Effects
```
Button Hover:
├─ hover:scale-105 (Scale up 5%)
├─ hover:shadow-md (Add shadow)
├─ hover:bg-<color>-100 (Change background)
└─ transition-all duration-200 (Smooth)

Icon Hover:
├─ opacity-0 group-hover:opacity-100 (Fade in)
└─ transition-opacity (Smooth fade)

Item Hover:
├─ hover:bg-slate-100 (Highlight)
└─ transition-all duration-200 (Smooth)
```

### State Indicators
```
Active Conversation:
├─ Border: border border-blue-300
├─ Background: bg-gradient-to-r from-blue-100 to-blue-50
└─ Shadow: shadow-sm

Typing Indicator:
├─ Animation: Pulse effect
└─ Color: text-slate-600
```

---

## Breakpoint Usage

### Tailwind Breakpoints
```
sm:  640px
md:  768px  ← Critical for tools menu
lg:  1024px ← Critical for sidebar visibility
xl:  1280px
2xl: 1536px
```

### Our Usage
```
hidden lg:flex
  → Sidebar visible only on 1024px+
  → Drawer menu only on <1024px

hidden md:flex
  → Tools menu visible on md+
  → Dropdown menu only on <md

hidden sm:flex
  → Large buttons visible on sm+
  → Icon buttons only on <sm

md:hidden, lg:hidden
  → Hide on specific breakpoints
```

---

## Icon System (Lucide React)

### Sizes
```
h-4 w-4 (Small - 16px)
h-5 w-5 (Medium - 20px)
h-8 w-8 (Large - 32px)
```

### Icons Used
```
Navigation:
├─ Plus (New Chat)
├─ Menu (Mobile Menu)
├─ ChevronRight (Dropdown indicator)
└─ MessageSquare (Conversation icon)

Actions:
├─ LogOut (Sign Out)
├─ Trash2 (Delete)
├─ Settings (More Options)
└─ FileText (Report)

Medical:
├─ Stethoscope (Doctor)
├─ AlertCircle (Emergency)
└─ TypingIndicator (AI Response)
```

### Icon Colors
```
Primary: text-slate-600
Active: text-blue-600
Alert: text-red-500
Success: text-green-500
Medical: text-emerald-600
```

---

## Responsive Patterns

### Menu Pattern
```
Desktop (md+):
Horizontal buttons: hidden md:flex

Mobile (<md):
Dropdown menu: md:hidden
```

### Button Pattern
```
Desktop (sm+):
Text + Icon: hidden sm:flex

Mobile (<sm):
Icon only: sm:hidden
```

### Sidebar Pattern
```
Desktop (lg+):
Permanent sidebar: hidden lg:flex

Mobile/Tablet (<lg):
Drawer menu: lg:hidden
```

---

## Shadow System

### Shadow Levels
```
shadow-sm: Subtle shadow (navigation, active items)
shadow-md: Medium shadow (hover state)
shadow-lg: Large shadow (modals, important items)

Usage:
├─ shadow-sm: Default for elements
├─ hover:shadow-md: Hover feedback
└─ Active state: shadow-sm
```

---

## Border System

### Border Styles
```
border: 1px solid
border-2: 2px solid (For buttons)
border-t: Top only
border-b: Bottom only
border-r: Right only

Colors:
├─ border-slate-200 (Default)
├─ border-slate-100 (Lighter)
├─ border-blue-300 (Active)
└─ border-red-200/300 (Alert)
```

---

## Gradient System

### Gradient Directions
```
from-blue-50 to-slate-50 (Vertical)
from-blue-500 to-blue-600 (Button)
from-blue-100 to-blue-50 (Active state)
```

### Usage
```
Header: from-blue-50 to-slate-50
LeftPanel bg: from-slate-50 to-white
LeftPanel footer: from-white to-transparent
Active item: from-blue-100 to-blue-50
Buttons: from-blue-500 to-blue-600
```

---

## This Refactoring Gives You

✨ **Professional Design** - Matches ChatGPT aesthetic
✨ **Clean Code** - Organized and maintainable
✨ **Responsive Layout** - Works on all devices
✨ **Smooth Animations** - Professional feel
✨ **Consistent Styling** - Color/spacing system
✨ **Accessible** - Proper semantic HTML
✨ **Scalable** - Ready for growth
✨ **Well Documented** - Easy to modify

