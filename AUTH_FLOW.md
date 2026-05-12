# Auth & Onboarding Flow

## What It Does
Handles the full new-user funnel: app launch → onboarding slides → sign-in/sign-up → paywall (optional) → main tabs. Also manages session persistence so returning users land directly in the app.

## Files
- `app/_layout.tsx` — root layout, auth routing logic
- `app/index.tsx` — splash / loading screen
- `app/onboarding.tsx` — 5-slide onboarding
- `app/sign-in.tsx` — Clerk sign-in screen
- `app/paywall.tsx` — RevenueCat premium paywall
- `app/(tabs)/_layout.tsx` — tab layout, user sync on mount

## Routing Logic

```
App opens → app/index.tsx (splash)
        ↓
Clerk auth state loaded:

  Not signed in:
    → First launch (no onboarding_seen flag) → app/onboarding.tsx
    → Returning user (onboarding done)       → app/sign-in.tsx

  Signed in:
    → syncUserToBackend() in app/(tabs)/_layout.tsx
    → app/(tabs)/home.tsx (main experience)
```

## Onboarding (`app/onboarding.tsx`)
- 5 slides explaining BackForge AI's value proposition
- Swipeable with progress dots
- Last slide CTA → `app/sign-in.tsx`
- `onboarding_seen` flag stored in `AsyncStorage` or `SecureStore`

## Sign-In (`app/sign-in.tsx`)
- Clerk's `<SignIn />` component — handles email/password and OAuth providers
- On success → Clerk auth state updates → root layout redirects to tabs

## User Sync (`app/(tabs)/_layout.tsx`)
On every sign-in or app resume, inside a `useEffect`:
```typescript
syncUserToBackend({
    id: user.id,
    emailAddresses: [...],
    firstName: user.firstName,
    imageUrl: pendingAvatar ?? user.imageUrl,
})
```
This upserts the user into Supabase (`POST /api/users/sync`). Pending avatar URL (custom avatar set during onboarding) is read from `SecureStore` and used for the initial sync.

## Paywall (`app/paywall.tsx`)
- Shown when a free-tier limit is hit (e.g., 5 daily chat messages reached)
- Uses RevenueCat `react-native-purchases` SDK
- Presents available subscription packages
- On purchase success → entitlement unlocked → user returns to previous screen
- "Restore Purchases" button for users who already subscribed

## RevenueCat Entitlement Check

```typescript
// services/revenuecat.ts
isProActive()               → boolean (SDK check — active RevenueCat entitlement)
getDailyMessageStats()      → { used, limit, remaining }
incrementDailyMessageCount()

// services/api.ts
getProStatus(userId)        → boolean (DB fallback via GET /api/users/pro-status)
```

Pro status uses a dual-check: `(await isProActive()) || (await getProStatus(userId))`.
Either source returning `true` grants Pro access — handles offline SDK or webhook-synced subscriptions.

Free tier: 5 chat messages/day. Pro: unlimited + premium features.

## Key Dependencies
- `@clerk/clerk-expo` — auth state, sign-in UI
- `react-native-purchases` — RevenueCat SDK
- `expo-secure-store` — pending avatar persistence
- `services/api.ts: syncUserToBackend()`
