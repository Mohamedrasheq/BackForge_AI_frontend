# Home Screen

## What It Does
The main dashboard of the app. Shows a personalised greeting, an AI narrative summary, an intelligence board with today's progress, a horizontal calendar timeline for browsing past/future dates, and a priority item list with a timeline layout.

## File
`app/(tabs)/home.tsx`

## Screen Sections (top to bottom)

### 1. Personalised Greeting
- User avatar (from Clerk or custom avatar stored in `SecureStore`)
- Random motivational tagline + time-based greeting ("Good morning") + user's first name
- Refreshes tagline on pull-to-refresh

### 2. Agent's Narrative
- Label: `AGENT'S PERSPECTIVE`
- Dynamic sentence summarising the day — adapts to: new user, past date, zero items, single item, multiple items
- Generated client-side from `getAgentNarrative(status, isNewUser, selectedDate)` — no API call

### 3. Intelligence Board
- Gradient card (indigo) with "BackForge AI Live" status badge
- Shows: "Watching over your day" + `X of Y items completed today`
- Circular progress ring showing completion percentage
- Footer: tappable "N items awaiting your review" → navigates to `/memory`

### 4. Calendar Timeline
- Horizontal scrollable row of date chips
- New users: today + 10 future days; existing users: 7 past days + today + 2 future
- Auto-scrolls to today on focus and initial load
- Tapping a date fetches memories for that date via `GET /api/memories?date=YYYY-MM-DD`
- Selected chip highlighted with tint colour + active dot

### 5. Priority Items
- Section label: "PRIORITY TODAY" or the selected date name
- **Single item**: clean card with left colour accent border (urgency colour)
- **Multiple items**: timeline layout with vertical connector line + urgency-coloured dots + time labels
- Each card shows: type badge, urgency label (Priority / Upcoming / Routine), title, due date/time, checkmark button
- Tapping checkmark → confirmation modal with haptic feedback
- Confirmation modal: "Mark as complete?" → `POST /api/close`

### 6. Empty / Completed State
- Lottie animation (Man Working on Laptop) when no pending items
- For past dates: filter toggle (Completed / Not Completed) showing historical records
- "See All" toggle for lists > 4 items

## Data Fetching

```
useFocusEffect + useEffect on selectedDate:
        ↓
Promise.all([
    getDailyBrief(userId)           → pending count for intelligence board
    getMemoriesByDate(userId, date) → all items for selected date
])
        ↓
Calculate: pendingItems, completedItems, progress percentage
```

## Realtime
Supabase Realtime subscription on `memory_items` → auto-refetches on any change.

## Key Dependencies
- `expo-haptics` — haptic feedback on date select, checkmark tap, confirm/cancel
- `react-native-reanimated` — `FadeIn`, `FadeInDown`, `FadeInLeft`, `LinearTransition` animations
- `lottie-react-native` — empty state animation
- `expo-linear-gradient` — intelligence board gradient
- `expo-image` — avatar rendering
