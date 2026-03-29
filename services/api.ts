/**
 * Client-side API service for Personal Agent App
 * Connects to external BackForge AI Backend
 */

import type {
    AssistantResponse,
    CapturePayload,
    CaptureResponse,
    ChatRequest,
    ChatResponse,
    CloseMemoryPayload,
    CloseMemoryResponse,
    DailyBriefResponse,
    DeleteAccountPayload,
    DeleteAccountResponse,
    DraftPayload,
    DraftResponse,
    ExecuteRequest,
    ExecuteResponse,
    GitHubRepo,
    LinearContextResponse,
    MemoriesResponse,
    Notification,
    ScheduleConfirmPayload,
    ScheduleConfirmResponse
} from '@/types/api';

// Default to localhost for development as per docs
// Use environment variable for API URL with fallback
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = ENV_API_URL || 'https://back-forge-ai.vercel.app/api';

/**
 * Capture user input and get agent response
 * POST /api/capture
 */
export async function captureMessage(
    payload: CapturePayload
): Promise<CaptureResponse> {
    console.log(`[API] POST ${API_BASE}/capture`);
    const response = await fetch(`${API_BASE}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to capture message');
    }

    return response.json();
}

/**
 * Get daily brief items for user
 * GET /api/daily-brief
 */
export async function getDailyBrief(userId: string): Promise<DailyBriefResponse> {
    console.log(`[API] GET ${API_BASE}/daily-brief?userId=${userId}`);
    const response = await fetch(`${API_BASE}/daily-brief?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch daily brief');
    }

    return response.json();
}

/**
 * Get AI Assistant conversational guidance
 * GET /api/assistant
 */
export async function getAssistantGuidance(userId: string): Promise<AssistantResponse> {
    console.log(`[API] GET ${API_BASE}/assistant?userId=${userId}`);
    const response = await fetch(`${API_BASE}/assistant?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch assistant guidance');
    }

    return response.json();
}

/**
 * Generate draft reply
 * POST /api/draft
 */
export async function createDraft(payload: DraftPayload): Promise<DraftResponse> {
    const response = await fetch(`${API_BASE}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to create draft');
    }

    return response.json();
}

/**
 * Mark a memory item as closed
 * POST /api/close
 */
export async function closeMemory(
    payload: CloseMemoryPayload
): Promise<CloseMemoryResponse> {
    const response = await fetch(`${API_BASE}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to close memory');
    }

    return response.json();
}

/**
 * Get all notifications for a user
 * GET /api/notifications
 */
export async function getNotifications(userId: string): Promise<{ notifications: Notification[] }> {
    const response = await fetch(`${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch notifications');
    }

    return response.json();
}

/**
 * Get all memories for a user
 * GET /api/memories
 */
export async function getAllMemories(userId: string): Promise<MemoriesResponse> {
    const response = await fetch(`${API_BASE}/memories?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch memories');
    }

    return response.json();
}

/**
 * Get memories for a specific date
 * GET /api/memories?userId=...&date=YYYY-MM-DD
 */
export async function getMemoriesByDate(userId: string, date: string): Promise<MemoriesResponse> {
    console.log(`[API] GET ${API_BASE}/memories?userId=${userId}&date=${date}`);
    const response = await fetch(`${API_BASE}/memories?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch memories for date');
    }

    return response.json();
}

/**
 * Delete user account and data
 * POST /api/delete-account
 */
export async function deleteAccount(
    payload: DeleteAccountPayload
): Promise<DeleteAccountResponse> {
    const response = await fetch(`${API_BASE}/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to delete account');
    }

    return response.json();
}

// ============ NEW: Unified Chat API ============

/**
 * Send a chat message and get reply + proposed actions
 * POST /api/chat
 */
export async function sendChatMessage(
    payload: ChatRequest
): Promise<ChatResponse> {
    console.log(`[API] POST ${API_BASE}/chat`);
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to send chat message');
    }

    return response.json();
}

/**
 * Send a chat message with streaming response
 * Uses XMLHttpRequest because fetch() with ReadableStream is not supported in React Native (native)
 */
export async function sendChatMessageStreaming(
    payload: ChatRequest,
    onDelta: (event: any) => void
): Promise<ChatResponse> {
    return new Promise((resolve, reject) => {
        console.log(`[API] POST ${API_BASE}/chat (streaming via XHR)`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/chat`);
        xhr.setRequestHeader('Content-Type', 'application/json');

        let seenBytes = 0;
        let buffer = "";
        let finalResult: ChatResponse | null = null;

        xhr.onreadystatechange = () => {
            // readyState 3 (LOADING) or 4 (DONE)
            if (xhr.readyState === 3 || xhr.readyState === 4) {
                const responseText = xhr.responseText;
                const newData = responseText.substring(seenBytes);
                seenBytes = responseText.length;

                buffer += newData;

                const lines = buffer.split("\n");
                // The last element might be a partial line, keep it in buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        try {
                            const jsonStr = trimmed.slice(6).trim();
                            if (!jsonStr) continue;
                            const event = JSON.parse(jsonStr);

                            onDelta(event);

                            if (event.type === "done") {
                                finalResult = {
                                    reply: event.reply,
                                    proposed_actions: event.proposed_actions,
                                    connected_services: event.connected_services,
                                    requires_calendar: event.requires_calendar,
                                    pending_item: event.pending_item,
                                    default_datetime: event.default_datetime
                                };
                            }
                        } catch (e) {
                            console.warn("[API] Failed to parse SSE JSON:", trimmed, e);
                        }
                    }
                }
            }

            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Final flush of residue in buffer
                    if (buffer.trim().startsWith("data: ")) {
                        try {
                            const event = JSON.parse(buffer.trim().slice(6).trim());
                            onDelta(event);
                            if (event.type === "done") {
                                finalResult = {
                                    reply: event.reply,
                                    proposed_actions: event.proposed_actions,
                                    connected_services: event.connected_services,
                                    requires_calendar: event.requires_calendar,
                                    pending_item: event.pending_item,
                                    default_datetime: event.default_datetime
                                };
                            }
                        } catch (e) { /* ignore partial at end */ }
                    }

                    if (finalResult) {
                        resolve(finalResult);
                    } else {
                        reject(new Error("Stream finished without 'done' event"));
                    }
                } else if (xhr.status !== 0) { // status 0 can happen on abort
                    reject(new Error(`Streaming request failed with status: ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network error during streaming"));
        };

        xhr.send(JSON.stringify({ ...payload, stream: true }));
    });
}

/**
 * Execute an approved action (Linear issue, GitHub issue, Gmail draft)
 * POST /api/execute
 */
export async function executeAction(
    payload: ExecuteRequest
): Promise<ExecuteResponse> {
    console.log(`[API] POST ${API_BASE}/execute`);
    const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to execute action');
    }

    return response.json();
}

/**
 * Fetch Linear workspace context (teams, users, labels, etc.)
 * GET /api/linear/context
 */
export async function fetchLinearContext(userId: string): Promise<LinearContextResponse> {
    console.log(`[API] GET ${API_BASE}/linear/context?userId=${userId}`);
    const response = await fetch(`${API_BASE}/linear/context?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch Linear context');
    }

    return response.json();
}

/**
 * Fetch accessible GitHub repositories
 * GET /api/github/repos
 */
export async function fetchGitHubRepos(userId: string): Promise<GitHubRepo[]> {
    console.log(`[API] GET ${API_BASE}/github/repos?userId=${userId}`);
    const response = await fetch(`${API_BASE}/github/repos?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch GitHub repos');
    }

    return response.json();
}

/**
 * Confirm scheduling of a task/reminder
 * POST /api/schedule-confirm
 */
export async function scheduleConfirm(
    payload: ScheduleConfirmPayload
): Promise<ScheduleConfirmResponse> {
    console.log(`[API] POST ${API_BASE}/schedule-confirm`);
    const response = await fetch(`${API_BASE}/schedule-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Failed to confirm schedule');
    }

    return response.json();
}

// ============ Push Notifications ============

/**
 * Register a device push token with the backend
 * POST /api/notifications/register
 */
export async function registerPushToken(
    userId: string,
    pushToken: string,
    platform: string,
    deviceToken?: string,
    token?: string
): Promise<{ success: boolean }> {
    console.log(`[API] POST ${API_BASE}/notifications/register`);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/register-device`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, pushToken, platform, deviceToken }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Registration failed (${response.status}):`, errorText);
        throw new Error(`Failed to register push token: ${errorText}`);
    }

    return response.json();
}

// ============ Credentials \u0026 Integrations ============

/**
 * Get connection status for all services for a user
 * GET /api/credentials/status?userId=...
 */
export async function getCredentialsStatus(userId: string): Promise<{
    connected: Array<{ service: string, metadata: any, connected_at: string }>;
    available: Array<{ name: string, displayName: string, description: string }>;
    all: Array<{
        name: string,
        displayName: string,
        description: string,
        credentialFields: Array<{
            key: string;
            label: string;
            type: string;
            required: boolean;
            helpUrl?: string;
            placeholder?: string;
        }>;
    }>;
}> {
    const response = await fetch(`${API_BASE}/credentials/status?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("Failed to fetch credentials status");
    return response.json();
}

/**
 * Connect a service
 * POST /api/credentials/connect
 */
export async function connectService(payload: {
    userId: string,
    service: string,
    credentials: Record<string, string>,
    metadata?: any
}): Promise<{ success: boolean, message: string }> {
    const response = await fetch(`${API_BASE}/credentials/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to connect service");
    }
    return response.json();
}

/**
 * Disconnect a service
 * POST /api/credentials/disconnect
 */
export async function disconnectService(payload: {
    userId: string,
    service: string
}): Promise<{ success: boolean, message: string }> {
    const response = await fetch(`${API_BASE}/credentials/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to disconnect service");
    return response.json();
}
