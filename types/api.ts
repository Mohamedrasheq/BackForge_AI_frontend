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
  /** Last edit, when the API sends one. Quiet rules fall back to `createdAt`. */
  updatedAt: string | null;
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
 * A suggestion that matches an existing category is prefilled.
 * `suggestedIsNew` with a name is shown on the chip and created on Confirm.
 * Parse itself never creates a category.
 */
export interface ProposedItem {
  text: string;
  dueAt: string | null;
  folderId: string | null;
  suggestedFolderId: string | null;
  suggestedCategory: string | null;
  /** True when the model invented a category the user does not have yet. */
  suggestedIsNew: boolean;
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
