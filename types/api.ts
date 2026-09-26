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
  /** Category id. Null is Unfiled. Wire field is `folder_id`. */
  folderId: string | null;
}

/** A category. The API collection is `/categories`; items point at it with `folder_id`. */
export interface Category {
  id: string;
  name: string;
}

/**
 * Proposed item from POST /items/parse — no server id until bulk save.
 * Suggestions are hints only. They are applied when they match an existing category.
 */
export interface ProposedItem {
  text: string;
  dueAt: string | null;
  folderId: string | null;
  suggestedFolderId: string | null;
  suggestedCategory: string | null;
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
  /** Null is Unfiled. Server also accepts `folderId`. */
  folder_id: string | null;
}

/**
 * PATCH /items/:id — partial update.
 * `body` matches bulk create. `due_at` is set or cleared (`null`).
 */
export interface UpdateItemRequest {
  body?: string;
  due_at?: string | null;
}

export interface DeviceRegisterResponse {
  success: boolean;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}
