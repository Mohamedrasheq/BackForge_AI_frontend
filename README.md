# BackForge

A quiet to-do and reminder app. Capture anything, see what needs you today, search everything, and get alerts.

## Screens

1. **Today** — open items that need you now (default home)
2. **All items** — full list and search
3. **Capture** — type or talk something in (mic records until you stop, then Whisper transcribes)
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

## Capture mic

Tap the mic to start recording. It stays on through pauses until you tap stop. The clip is uploaded to `POST /capture/transcribe` as multipart field `file` (m4a / caf / wav / webm) with the Clerk Bearer token. The composer is replaced with `{ text }` from Whisper — it is not appended live, so you get one transcript.

Microphone permission is required. If permission is denied or transcription fails, Capture shows an error and you can type instead.

## Stack

- Expo SDK 54 / React Native
- Expo Router
- Clerk auth (Bearer token)
- Expo Notifications
- Expo AV recording + Whisper transcription (`POST /capture/transcribe`)
