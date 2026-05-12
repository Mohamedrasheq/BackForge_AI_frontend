# Integrations Screen

## What It Does
Lets users connect and disconnect third-party services. Shows which services are already connected, displays their connection date, and provides a form to enter credentials for new ones.

## File
`app/(tabs)/integrations.tsx`

## Data Source
`GET /api/credentials/status?userId=...`

Returns:
```typescript
{
    connected: Array<{ service, metadata, connected_at }>
    available: Array<{ name, displayName, description }>
    all: Array<{ name, displayName, description, credentialFields }>
}
```

`credentialFields` drives the dynamic input form — each service specifies what credentials it needs (e.g., GitHub requires a Personal Access Token, Linear requires an API Key).

## Connect Flow

```
User taps a service → credential input sheet slides up
        ↓
Dynamic form rendered from credentialFields:
  { key, label, type ("password"/"text"), required, helpUrl, placeholder }
        ↓
User fills in credentials → taps "Connect"
        ↓
connectService({ userId, service, credentials })
        ↓
POST /api/credentials/connect
        ↓
Service appears in Connected list
        ↓
Claude agent can now use that service's tools in Chat
```

## Disconnect Flow

```
User taps "Disconnect" on a connected service
        ↓
Confirmation prompt
        ↓
disconnectService({ userId, service })
        ↓
POST /api/credentials/disconnect
        ↓
Service moves back to Available list
```

## Help Links
Each credential field can include a `helpUrl` pointing to the service's API token page (e.g., GitHub developer settings). Shown as a "How to get this?" link next to the input.

## Special Cases
- **GitHub**: After connecting, the app fetches repo list via `GET /api/github/repos` to validate the token and pre-cache accessible repos for the chat agent.
- **Linear**: After connecting, fetches workspace context via `GET /api/linear/context` for team/project info.

## Pro Status Check
Pro status is checked on every screen focus via `useFocusEffect` using the dual-check pattern:
`(await isProActive()) || (await getProStatus(userId))`
This ensures the UI reflects the correct subscription state even after a purchase or webhook update.

## Key Dependencies
- `services/api.ts: getCredentialsStatus()`, `connectService()`, `disconnectService()`, `getProStatus()`
- `services/revenuecat.ts: isProActive()`
- `components/ui/glass-card.tsx`, `glass-input.tsx`, `glass-button.tsx`
- `expo-haptics` — feedback on connect/disconnect
