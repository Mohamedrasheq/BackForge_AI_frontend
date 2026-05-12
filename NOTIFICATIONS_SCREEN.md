# Notifications Screen

## What It Does
Displays the history of all push notifications that have been scheduled or sent for the user. Also handles the initial device registration for push notifications.

## File
`app/(tabs)/notifications.tsx`

## Data Source
`GET /api/notifications?userId=...`

Returns:
```typescript
{
    notifications: Array<{
        id, user_id, memory_item_id,
        title, body,
        scheduled_at,
        status: "scheduled" | "sent" | "failed",
        scheduled_message_id
    }>
}
```

## Device Registration

On first app launch (inside `app/_layout.tsx` or the notifications screen), the device registers its Expo push token with the backend:

```typescript
// services/notifications.ts
registerForPushNotifications()
        ↓
Expo.Notifications.getExpoPushTokenAsync()
        ↓
registerPushToken(userId, pushToken, platform)
        ↓
POST /api/register-device { userId, pushToken, platform }
```

On Android, a notification channel is created explicitly (required for Android 8+). This is done in `services/notifications.ts`.

## Notification List UI

- Each item shows: title, body text, scheduled time (relative, e.g., "2 hours ago"), status badge
- Status colours: scheduled = blue, sent = green, failed = red
- Tapping a notification related to a memory item navigates to that item in the Memory screen
- Empty state when no notifications have been sent yet

## Push Notification Handling

When the app is foregrounded and a push arrives, `app/_layout.tsx` handles the `notification.data` payload:
```typescript
{ screen: "memory", itemId: "..." }
```
This deep-links the user directly to the relevant memory item.

## Key Dependencies
- `expo-notifications` — push token, notification channels, foreground handler
- `services/api.ts: getNotifications()`, `registerPushToken()`
- `services/notifications.ts` — `registerForPushNotifications()`
