# BackForge

A quiet to-do and reminder app. Capture anything, see what needs you today, search everything, and get alerts.

## Screens

1. **Today** — open items that need you now (default home)
2. **All items** — full list and search
3. **Capture** — type or talk something in
4. **Alerts** — notification permission and upcoming reminders
5. **Account** — sign in/out and essentials

## Setup

```bash
npm install
```

Create `.env.local`:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
EXPO_PUBLIC_API_URL=https://back-forge-ai.vercel.app/api
```

```bash
npx expo start
```

## Stack

- Expo SDK 54 / React Native
- Expo Router
- Clerk auth (Bearer token)
- Expo Notifications
- Expo Speech Recognition
