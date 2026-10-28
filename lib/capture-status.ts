/** Capture Break down / Confirm copy and timings. Made-up counts go through the same formatters. */

export const PARSE_TIMEOUT_MS = 45_000;
export const CONFIRM_STILL_SAVING_MS = 8_000;
export const SAVED_BANNER_MS = 3_000;
export const SAVED_BANNER_FADE_MS = 150;

export const PARSE_TIMEOUT_MESSAGE = 'That took too long. Try again.';
export const PARSE_NO_CONNECTION_MESSAGE = 'No connection…';
export const CONFIRM_STILL_SAVING_MESSAGE = 'Still saving, hang on…';
export const CONFIRM_SAVE_FAILED_MESSAGE = "Couldn't save. Your tasks are still here. Try again.";

export function captureParseStatus(elapsedMs: number): string {
  if (elapsedMs < 3_000) return 'Reading your note…';
  if (elapsedMs < 10_000) return 'Splitting it into tasks…';
  if (elapsedMs < 20_000) return 'Adding dates and times…';
  return 'Almost there…';
}

export function confirmSavingLabel(count: number): string {
  return count === 1 ? 'Saving 1 task…' : `Saving ${count} tasks…`;
}

export function savedTasksLabel(count: number): string {
  return count === 1 ? 'Saved 1 task' : `Saved ${count} tasks`;
}

export function isNoConnectionError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('internet')
  );
}

export function captureParseFailureMessage(err: unknown, timedOut: boolean): string {
  if (timedOut) return PARSE_TIMEOUT_MESSAGE;
  if (isNoConnectionError(err)) return PARSE_NO_CONNECTION_MESSAGE;
  return err instanceof Error ? err.message : 'Could not break that down';
}
