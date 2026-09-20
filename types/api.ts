/**
 * BackForge v1 API types.
 * Responses are normalized in services/api.ts so field-name drift is tolerated.
 */

export type ItemStatus = 'open' | 'done';

export interface Item {
  id: string;
  text: string;
  status: ItemStatus;
  dueAt: string | null;
  createdAt: string | null;
}

/** Proposed item from POST /items/parse — no server id until bulk save. */
export interface ProposedItem {
  text: string;
  dueAt: string | null;
}

export interface CaptureResponse {
  item: Item | null;
}

export interface TranscribeResponse {
  text: string;
}

/** POST /items/bulk item — server requires `body`, not the UI's `text`. */
export interface BulkCreateItem {
  body: string;
  due_at: string | null;
}

export interface DeviceRegisterResponse {
  success: boolean;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}
