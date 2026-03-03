# Changelog

## [2026-02-20] — Integrations Screen Overhaul & Onboarding Rebuild

### Onboarding (5-Slide Rebuild)
- **Expanded from 3 → 5 slides** covering: Brain/Memory, AI Assistant, Integrations, Smart Notifications, and Privacy.
- **Generated 5 premium 3D illustrations** in the app's indigo brand palette.
- **Added "Skip" button** in the top-right for quick access to sign-in.
- **Re-enabled onboarding route** in `_layout.tsx` — first-launch users now see onboarding; returning users go straight to sign-in.

### Home Tab Icon
- Changed the home tab icon to a more detailed house silhouette (`house`) to provide a fresh but recognizable look.

### API & Chat
- **Streaming Chat Support** — Added `sendChatMessageStreaming` using `XMLHttpRequest` to support real-time responses in the mobile environment.


### Connected Services UI
- **Connected Apps Summary** — Replaced generic "X services connected" count with a detailed panel listing each service by name, emoji, connection date, and an "Active" badge.
- **Fallback Display Name** — If a connected service isn't in `availableServices`, the service name is capitalized as a fallback.

### Credential Modal (Bottom Sheet → Full-Screen Modal)
- **Replaced `@gorhom/bottom-sheet`** with a native `Modal` (`presentationStyle="pageSheet"`) wrapping `KeyboardAvoidingView` + `ScrollView`.
  - **Why:** The bottom sheet's `keyboardBehavior="interactive"` was unreliable on iOS — credential fields (especially the last one) would hide behind the keyboard.
  - **Result:** All fields are now fully accessible and the view scrolls automatically to the focused input.
- **Hero Branding Section** — Added a large gradient emoji circle, service name, and description at the top of the modal to fill empty space and give it a polished feel.
- **Top Spacing** — Increased `paddingTop` in the modal header for breathing room.

### Dark Mode Disconnect Dialog (Android)
- **Replaced native `Alert.alert()`** for the disconnect confirmation with a **custom styled modal** that uses the app's `colors.background`, `colors.text`, and `colors.textSecondary`.
  - **Why:** Android's native `AlertDialog` via `Alert.alert()` doesn't respect the app's dark theme, showing a white dialog even in dark mode.
  - **Result:** The confirmation now adapts properly to both light and dark modes with a red "Disconnect" button and a subtle "Cancel" button.

### Icon Updates
- **Disconnect Icon Fix** — Changed from `link.badge.plus` (SF Symbol, no Android mapping) to `link` which maps to Material Icons on Android.
- **Home Tab Icon** — Changed from `house.fill` (classic house) to `square.grid.2x2.fill` (dashboard grid) for a modern look.

### Settings → Integrations Navigation
- Added an **"Integrations → Manage"** row in the Settings screen under Preferences, allowing users to navigate to the Integrations tab directly from Settings.

### Sign Out Modal (Android Dark Mode)
- **Replaced native `Alert.alert()`** for the sign-out confirmation in `profile.tsx` with a custom styled modal matching the disconnect dialog pattern — properly adapts to dark mode on Android.

---

### Files Modified

| File | Changes |
|------|---------|
| `app/(tabs)/integrations.tsx` | Connected apps summary, credential modal rewrite, dark mode disconnect dialog, hero section |
| `app/(tabs)/_layout.tsx` | Home tab icon change |
| `app/onboarding.tsx` | 5-slide rebuild with new images, Skip button, indigo gradients |
| `app/_layout.tsx` | Re-enabled onboarding route for first-launch users |
| `app/settings.tsx` | Added Integrations navigation row |
| `app/profile.tsx` | Dark-mode-aware sign-out confirmation modal |
| `components/ui/icon-symbol.tsx` | _(reference)_ Verified icon mappings for Android compatibility |
| `assets/images/onboarding-{1..5}.png` | 5 new 3D illustrations |
