# BackForge — Claude Code Guide

## Project Overview

**BackForge** is an Expo/React Native app: a smart to-do and reminder brain. Capture anything, see what needs you today, search all items, enable alerts, and manage the account.

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo 54 (managed workflow)
- **Routing**: Expo Router 6 (file-based)
- **Language**: TypeScript 5.9
- **Auth**: Clerk (`@clerk/clerk-expo`) — Bearer token on every API call
- **Notifications**: Expo Notifications
- **Speech**: `expo-speech-recognition` on Capture

## Commands

```bash
npx expo start
npx expo run:ios
npx expo run:android
npx expo start --web
expo lint
```

## Screens

```
app/
  _layout.tsx          # Clerk, signed-out → sign-in, token provider
  index.tsx            # Boot splash
  sign-in.tsx          # Google / email
  (tabs)/
    index.tsx          # Today (default home)
    items.tsx          # All items + search
    capture.tsx        # Type / talk in
    alerts.tsx         # Notification permission + upcoming
    account.tsx        # Sign out, essentials
```

## Backend (v1)

Base URL: `EXPO_PUBLIC_API_URL` (default `https://back-forge-ai.vercel.app/api`).

All requests send `Authorization: Bearer <Clerk getToken()>`. Never send `userId` in bodies.

- `POST /items` `{ text }`
- `GET /today`
- `GET /items?q=`
- `POST /items/:id/done`
- `POST /devices` `{ push_token }`

Client: `services/api.ts`. Types: `types/api.ts`.

## Environment

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL=https://back-forge-ai.vercel.app/api
```

## Design

Tokens live in `constants/theme.ts`.

- Background `#F8FAFC`, white cards
- Accent `#4F46E5`, pressed `#4338CA`
- Near-black text, slate secondary
- Large Today titles, generous spacing
- Capture tab + FAB on Today
