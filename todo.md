# Chat Feature Implementation TODO

## Files to Create/Modify:

### 1. Database & Backend
- [ ] Create SQL migration for messages table
- [ ] Create edge function: send_message
- [ ] Create edge function: get_messages
- [ ] Create edge function: mark_messages_read

### 2. Frontend API Layer
- [ ] Update src/lib/supabase.ts - Add chat API functions and interfaces

### 3. UI Components
- [ ] Create src/components/chat/MessageBubble.tsx - Individual message display
- [ ] Create src/components/chat/MessageList.tsx - List of messages with auto-scroll
- [ ] Create src/components/chat/MessageInput.tsx - Text input with send button
- [ ] Create src/components/chat/ChatHeader.tsx - Chat header with user info

### 4. Pages
- [ ] Create src/pages/Chat.tsx - Patient chat page
- [ ] Create src/pages/doctor/DoctorChat.tsx - Doctor chat page with conversation list

### 5. Navigation & Badges
- [ ] Update src/components/Sidebar.tsx - Add chat navigation and unread badges
- [ ] Update src/components/doctor/DoctorSidebar.tsx - Add chat navigation and unread badges

### 6. Translations
- [ ] Update src/i18n/locales/en.json - Add chat translations
- [ ] Update src/i18n/locales/ro.json - Add chat translations

### 7. Routing
- [ ] Update src/App.tsx - Add chat routes

## Implementation Order:
1. Database schema and edge functions
2. Frontend API layer
3. UI components
4. Patient chat page
5. Doctor chat page
6. Navigation updates with badges
7. Translations
8. Testing and refinement