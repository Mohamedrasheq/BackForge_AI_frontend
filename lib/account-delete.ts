export const DELETE_ACCOUNT_LABEL = 'Delete account';
export const DELETE_ACCOUNT_TITLE = 'Delete your account?';
export const DELETE_ACCOUNT_NOTE = "This removes all your tasks and categories and can't be undone.";
export const DELETE_ACCOUNT_FAILED = "Couldn't delete your account. Try again.";

/** `DELETE /account` succeeds only with `{ ok: true }`. */
export function isAccountDeleted(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true
  );
}
