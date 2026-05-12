# Settings & Profile

## What It Does
Lets users manage their profile (avatar, name), view subscription status, access legal documents, and delete their account.

## Files
- `app/(tabs)/settings.tsx` — main settings screen
- `app/profile.tsx` — profile editing screen

## Settings Screen Sections

### Account
- Profile picture + name (navigates to `app/profile.tsx`)
- Subscription status (Free / Pro) — dual-check: `isProActive()` (RevenueCat SDK) OR `getProStatus(userId)` (DB)
- Status re-checked on screen focus via `useFocusEffect`
- "Upgrade to Pro" button → `app/paywall.tsx` if on free tier

### Notifications
- Toggle push notifications on/off
- Uses `expo-notifications` permission API

### Integrations Shortcut
- Quick link to the Integrations tab

### Legal
- Privacy Policy → `https://loop-backend-pearl.vercel.app/privacy`
- Terms of Service → `https://loop-backend-pearl.vercel.app/terms`
- EULA → `https://loop-backend-pearl.vercel.app/eula`

### Danger Zone
- **Delete Account** — confirmation prompt → `POST /api/delete-account`
  Deletes all user data from Supabase (memories, credentials, notifications, user row)
- **Sign Out** — Clerk `signOut()` → redirects to onboarding/sign-in

## Profile Screen (`app/profile.tsx`)

- Displays current avatar
- Custom avatar selection (stored locally in `SecureStore` as `pending_avatar_url`)
- First name / display name editing
- Changes synced via `POST /api/users/sync` on next app launch

## Key Dependencies
- `@clerk/clerk-expo: useUser(), signOut()` — auth state + sign-out
- `services/revenuecat.ts: isProActive()` — RevenueCat SDK pro check
- `services/api.ts: getProStatus()`, `deleteAccount()` — DB pro fallback, account deletion
- `expo-notifications` — push permission toggle
- `expo-secure-store` — custom avatar URL persistence
