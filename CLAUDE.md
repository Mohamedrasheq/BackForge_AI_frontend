# Loop - Claude Code Guide

## Project Overview

**Loop** is a React Native mobile app (Expo) — a personal AI agent assistant for managing work tasks, memory, integrations, and daily briefings. It targets iOS and Android with a subscription model (RevenueCat).

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo 54 (managed workflow)
- **Routing**: Expo Router 6 (file-based, like Next.js)
- **Language**: TypeScript 5.9
- **Auth**: Clerk (`@clerk/clerk-expo`)
- **Database/Realtime**: Supabase
- **Subscriptions**: RevenueCat (`react-native-purchases`)
- **Animations**: React Native Reanimated 4
- **Notifications**: Expo Notifications + FCM

## Commands

```bash
npx expo start          # Start dev server
npx expo run:ios        # Run on iOS simulator
npx expo run:android    # Run on Android emulator
expo lint               # Lint with ESLint
```

## Project Structure

```
app/                    # Screens (Expo Router)
  _layout.tsx           # Root layout: auth routing, notifications, RevenueCat init
  index.tsx             # Loading/splash screen
  onboarding.tsx        # 5-slide onboarding flow
  sign-in.tsx           # Clerk auth screen
  paywall.tsx           # RevenueCat premium paywall
  settings.tsx
  profile.tsx
  (tabs)/               # Tab navigation
    home.tsx            # Dashboard: daily brief, memory status
    chat.tsx            # AI chat (streaming, message limits)
    brief.tsx           # Daily briefing
    memory.tsx          # Memory management
    integrations.tsx    # GitHub, Linear, etc.
    notifications.tsx

components/
  ui/                   # Design system components
    glass-button.tsx    # Glassmorphic button
    glass-card.tsx      # Glassmorphic card
    glass-input.tsx     # Glassmorphic input
    header.tsx
    chat-bubble.tsx
    icon-symbol.tsx     # SF Symbols → Material Icons cross-platform wrapper

services/
  api.ts                # Backend API client (https://loop-backend-pearl.vercel.app/api)
  revenuecat.ts         # Subscription logic, pro entitlement, message limits
  notifications.ts      # Push token registration, notification channels

lib/
  auth.ts               # User sync to backend
  supabase.ts           # Realtime subscriptions
  haptics.ts            # Haptic feedback utilities

constants/
  theme.ts              # Colors, spacing, fonts, shadows, border radius

types/
  api.ts                # API request/response types
```

## Environment Variables

All prefixed `EXPO_PUBLIC_` (embedded in bundle):

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL=https://loop-backend-pearl.vercel.app/api
```

## Design System

**Colors** (defined in `constants/theme.ts`):
- Primary: `#4F46E5` (Indigo-600)
- Text: `#1E293B` (Slate-800)
- Secondary Text: `#64748B` (Slate-500)
- Background: `#FFFFFF`
- Border: `#E2E8F0` (Slate-200)

**Spacing scale**: xs=4, sm=8, md=16, lg=24, xl=32, xxl=48

**Design language**: Glassmorphic components, minimal/clean aesthetic, rounded corners, subtle shadows

## Key Patterns

### Icon Usage
Use `icon-symbol.tsx` for cross-platform icons — it maps SF Symbols (iOS) to Material Icons (Android). Never import platform-specific icon sets directly in screens.

### Auth Flow
`_layout.tsx` handles routing based on Clerk auth state: unauthenticated → onboarding → sign-in, authenticated → tabs. RevenueCat is initialized and user identified in `_layout.tsx`.

### Subscription / Pro Features
- Check `services/revenuecat.ts` for `checkProEntitlement()` and `getRemainingMessages()`
- Free tier: 5 chat messages/day
- Pro: unlimited messages + premium features
- Demo mode fallback available for Expo Go testing (no native purchase needed)
- Paywall at `app/paywall.tsx`

### API Calls
All backend calls go through `services/api.ts`. The backend is at `https://loop-backend-pearl.vercel.app/api`. Use existing typed functions rather than raw fetch calls.

### Realtime (Supabase)
`lib/supabase.ts` sets up realtime subscriptions for `memory_items`. Subscribe in `useEffect` and always call the returned unsubscribe function on cleanup.

### Streaming Chat
Chat uses `XMLHttpRequest` for streaming responses. See `app/(tabs)/chat.tsx` for the implementation pattern.

## Platform Notes

- **iOS**: Primary target. Uses SF Symbols for icons.
- **Android**: Secondary. Requires explicit notification channel setup (done in `services/notifications.ts`). Uses Material Icons.
- **Web**: Tertiary/dev only via `expo start --web`.

## Build & Distribution

- EAS (Expo Application Services) for cloud builds — see `eas.json`
- `google-services.json` is present for FCM (Android push notifications)
- App bundle IDs and build configs are in `app.json` / `app.config.js`
