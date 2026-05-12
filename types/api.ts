/**
 * Shared API Types for Personal Agent App
 * Based on BackForge AI Backend API Documentation
 */

export type MemoryType = 'task' | 'follow_up' | 'note';
export type Urgency = 'low' | 'medium' | 'high';
export type MemoryStatus = 'open' | 'nudged' | 'closed' | 'ignored';
export type DraftTone = 'polite' | 'professional' | 'firm';

// ============ Capture API ============
export interface CapturePayload {
    userId: string;
    text: string;
    timezone: string;
}

export interface CaptureResponse {
    agentMessage: string;
}

// ============ Daily Brief API ============
export interface DailyBriefItem {
    id: string;
    title: string;
    type: MemoryType;
    urgency: Urgency;
    dueAt: string | null;
}

// Response wrapper for /api/daily-brief
export interface DailyBriefResponse {
    items: DailyBriefItem[];
}

// ============ Assistant API ============
export interface AssistantResponse {
    message: string;
}

// ============ Memories API ============
export interface MemoryItem {
    id: string;
    user_id: string;
    type: MemoryType;
    urgency: Urgency;
    title: string;
    context: string | null;
    source_text: string;
    status: MemoryStatus;
    scheduled_message_id?: string | null;
    due_at: string | null;
    created_at: string;
}

export type NotificationStatus = "scheduled" | "sent" | "failed" | "cancelled";

export interface Notification {
    id: string;
    user_id: string;
    memory_item_id: string | null;
    title: string;
    body: string;
    scheduled_at: string;
    status: NotificationStatus;
    scheduled_message_id: string | null;
    created_at: string;
}

export interface MemoriesResponse {
    items: MemoryItem[];
}

// ============ Draft API ============
export interface DraftPayload {
    userId: string;
    memoryItemId: string;
    tone: DraftTone;
}

export interface DraftResponse {
    draftText: string;
}

// ============ Close Memory API ============
export interface CloseMemoryPayload {
    memoryItemId: string;
}

export interface CloseMemoryResponse {
    success: boolean;
}

// ============ Error Response ============
export interface ErrorResponse {
    error: string;
}

// ============ Delete Account API ============
export interface DeleteAccountPayload {
    userId: string;
}

export interface DeleteAccountResponse {
    success: boolean;
}

// ============ Chat API (Unified) ============
export interface ChatRequest {
    userId: string;
    text: string;
    timezone: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
}

// Payload types for each action
export interface LinearIssuePayload {
    teamId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    priority?: number; // 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
    labelIds?: string[];
    projectId?: string;
    cycleId?: string;
    stateId?: string;
    dueDate?: string; // "YYYY-MM-DD"
    estimate?: number;
    subscriberIds?: string[];
    parentId?: string;
}

export interface GitHubIssuePayload {
    repo: string; // "owner/repo"
    title: string;
    body?: string;
}

export interface GmailDraftPayload {
    to: string;
    subject: string;
    body: string;
}

export type ActionType = 'create_linear_issue' | 'create_github_issue' | 'draft_gmail_reply';

export interface ProposedAction {
    id: string;
    type: ActionType;
    requires_approval: boolean;
    payload: LinearIssuePayload | GitHubIssuePayload | GmailDraftPayload;
}

export interface ChatResponse {
    reply: string;
    proposed_actions: ProposedAction[];
    connected_services?: string[];
    requires_calendar?: boolean;
    pending_item?: any;
    default_datetime?: string;
}

// ============ Schedule API ============
export interface ScheduleConfirmPayload {
    userId: string;
    scheduledAt: string; // ISO string
    pendingItem: any;
}

export interface ScheduleConfirmResponse {
    success: boolean;
    memoryItemId: string;
    scheduledAt: string;
    notificationScheduled: boolean;
}

// ============ Execute API ============
export interface ExecuteRequest {
    userId: string;
    action: ProposedAction;
    memoryItemId?: string;
}

export interface ExecuteResponse {
    success: boolean;
    successMessage?: string;
    result?: Record<string, unknown>;
    error?: string;
}

// ============ Linear Context API ============
export interface LinearTeam {
    id: string;
    name: string;
    key: string;
}

export interface LinearUser {
    id: string;
    name: string;
    displayName: string;
    active: boolean;
}

export interface LinearLabel {
    id: string;
    name: string;
    color: string;
    team?: { id: string };
}

export interface LinearProject {
    id: string;
    name: string;
    state: string;
    teams?: { nodes: { id: string }[] };
}

export interface LinearCycle {
    id: string;
    name: string;
    number: number;
    startsAt: string;
    endsAt: string;
    team?: { id: string };
}

export interface LinearWorkflowState {
    id: string;
    name: string;
    type: string;
    team?: { id: string };
}

export interface LinearContextResponse {
    teams: LinearTeam[];
    users: LinearUser[];
    labels: LinearLabel[];
    projects: LinearProject[];
    cycles: LinearCycle[];
    workflowStates: LinearWorkflowState[];
}

// ============ GitHub Repos API ============
export interface GitHubRepo {
    full_name: string;
    name: string;
    private: boolean;
}

// ============ Chat Message Types ============
export interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    proposedActions?: ProposedAction[];
    executionResult?: {
        actionType: ActionType;
        success: boolean;
        message: string;
    };
}
