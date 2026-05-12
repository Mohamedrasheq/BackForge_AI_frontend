# Chat Screen

## What It Does
The primary interface for interacting with the Claude AI agent. Users can capture tasks, issue commands to connected services (e.g., "@linear create issue"), and have a natural conversation. Responses stream in real time. Message limits apply on the free tier.

## File
`app/(tabs)/chat.tsx`

## Key Behaviours

### Streaming
Responses stream token-by-token using `sendChatMessageStreaming()` in `services/api.ts`. React Native's native layer doesn't support `fetch` with `ReadableStream`, so streaming is implemented with `XMLHttpRequest` polling `readyState === 3` (LOADING).

SSE event types rendered:
- `text_delta` → appends text to the current assistant bubble
- `tool_use` → shows "Using [tool]..." status indicator
- `tool_result` → updates the tool status (success / error)
- `done` → finalises the message, stores `captured_item` if present

### Message Limits (Free Tier)
- Free: 5 messages per day
- Pro: unlimited
- Pro status checked at send time using dual-check: `(await isProActive()) || (await getProStatus(userId))`
  - `isProActive()` — RevenueCat SDK check; `getProStatus()` — DB fallback via `GET /api/users/pro-status`
- Pro status re-checked on every screen focus via `useFocusEffect`
- When limit reached → paywall screen is shown (`app/paywall.tsx`)

### Conversation History
Recent messages are kept in local state and passed as `history` to each API call so Claude has context for multi-turn conversations.

### @-Tag Routing
The user must prefix a service name with `@` to trigger tool use (e.g., `@github`, `@linear`, `@slack`). Without an @-tag, Claude responds conversationally without calling any tools.

### @schedule Tag
Adding `@schedule` to a message tells Claude to extract a structured task item from the conversation and return it inside `<extracted>...</extracted>`. The backend parses this and can auto-create a memory item.

## UI Elements

- **Chat bubbles** — user on right, assistant on left with streaming text
- **Tool status chips** — appear inline when Claude is calling a service
- **Proposed actions** — rendered below the reply when the agent suggests creating issues, drafts, etc.
- **Input bar** — text input + send button, disabled while streaming
- **Message counter** — shows remaining free messages
- **Capture shortcut** — quick-access button for common capture phrases

## API Call

```typescript
sendChatMessageStreaming({
    userId,
    message,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    history: recentMessages,
    stream: true
}, onDelta)
```

## Key Dependencies
- `services/api.ts: sendChatMessageStreaming()` — XHR-based SSE client
- `services/api.ts: getProStatus()` — DB-based pro status fallback
- `services/revenuecat.ts: isProActive()` — RevenueCat SDK pro check
- `services/revenuecat.ts: getDailyMessageStats()`, `incrementDailyMessageCount()` — free tier tracking
- `components/ui/chat-bubble.tsx` — message bubble component
- `expo-haptics` — send haptic feedback
