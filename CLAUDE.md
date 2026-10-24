# BackForge — Claude Code Guide

## Project Overview

**BackForge** is an Expo/React Native app: a smart to-do and reminder brain. Capture anything, see what needs you today, browse all items, ask about your list, enable alerts, and manage the account.

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo 54 (managed workflow)
- **Routing**: Expo Router 6 (file-based)
- **Language**: TypeScript 5.9
- **Auth**: Clerk (`@clerk/clerk-expo`) — Bearer token on every API call
- **Notifications**: Expo Notifications
- **Speech**: `expo-av` records on Capture until stop, then `POST /capture/transcribe` (Whisper)

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
  _layout.tsx          # Clerk, signed-out → onboarding or sign-in, token provider
  index.tsx            # Boot splash
  onboarding.tsx       # First-launch intro
  sign-in.tsx          # Google / email
  review.tsx           # Quiet-item review
  category/[id].tsx    # One category's items
  (tabs)/
    index.tsx          # Today (default home)
    items.tsx          # Calendar / upcoming / categories
    capture.tsx        # Type / talk in
    ask.tsx            # Questions and proposed changes
    account.tsx        # Sign out, notifications, delete account
```

## Backend (v1)

Base URL: `EXPO_PUBLIC_API_URL` (default `https://back-forge-ai.vercel.app/api`).

All requests send `Authorization: Bearer <Clerk getToken()>`. Never send `userId` in bodies.

- `POST /items/parse` `{ text, timezone }`
- `POST /items/bulk` `{ items, source? }`
- `GET /today`
- `GET /items`
- `PATCH /items/:id` `{ body?, due_at?, folder_id?, source? }`
- `POST /items/:id/done` `{ source? }`
- `DELETE /items/:id`
- `GET /categories`
- `POST /categories` `{ name }`
- `POST /ask` `{ message, timezone, history? }` (JSON or SSE)
- `POST /devices` `{ push_token }`
- `POST /capture/transcribe` multipart `file` (m4a/caf/wav/webm) → `{ text }`
- `DELETE /account`

Client: `services/api.ts`. Types: `types/api.ts`.

## Environment

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL=https://back-forge-ai.vercel.app/api
```

## Design

Tokens live in `constants/theme.ts`.

- Background `#F7F8FA`, white cards
- Accent `#B45309`, pressed `#92400E`
- Near-black text, slate secondary
- Large Today titles, generous spacing
- Capture tab + FAB on Today
