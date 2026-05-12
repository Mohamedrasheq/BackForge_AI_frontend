# Memory Screen

## What It Does
Displays all of the user's memory items (tasks, follow-ups, notes) with filtering, sorting, and the ability to mark items complete. Acts as the full task list view, complementing the priority-focused Home screen.

## File
`app/(tabs)/memory.tsx`

## Data Source
`GET /api/memories?userId=...` — returns all open memory items, optionally filtered by date.

## Features

### Filtering
- By type: All / Tasks / Follow-ups / Notes
- By status: Open / Closed
- By urgency: All / High / Medium / Low

### Item Cards
Each memory card shows:
- Type icon + urgency colour accent
- Title (up to 2 lines)
- Due date (relative or absolute)
- Urgency badge (Priority / Upcoming / Routine)
- Checkmark button → marks complete via `POST /api/close`

### Complete Flow
Tapping the checkmark triggers a haptic + confirmation sheet. On confirm:
```
closeMemory({ memoryItemId })   ← services/api.ts
        ↓
POST /api/close { memoryItemId }
        ↓
Item removed from local state (optimistic update)
```

### Realtime
Supabase Realtime subscription keeps the list live — new items captured in chat or from webhooks appear without a refresh.

### Empty State
When no items match the current filter, shows an illustration with a CTA to start a chat capture.

## Key Dependencies
- `services/api.ts: getAllMemories()`, `closeMemory()`
- `lib/supabase.ts: subscribeToMemoryChanges()`
- `components/ui/glass-card.tsx` — card container
- `expo-haptics` — checkmark haptic
- `react-native-reanimated` — list entry animations
