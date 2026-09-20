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

export interface CaptureResponse {
  item: Item | null;
}

export interface TranscribeResponse {
  text: string;
}

export interface DeviceRegisterResponse {
  success: boolean;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}
