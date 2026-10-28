/** Account profile name: trim/collapse, save rules, and Clerk error copy. */

export const PROFILE_NAME_MAX_LENGTH = 50;
export const PROFILE_NAME_UNSIGNED = 'Signed in';
export const PROFILE_NAME_REQUIRED = 'First name is required.';
export const PROFILE_NAME_OFFLINE = 'No connection. Check your internet and try again.';
export const PROFILE_NAME_FAILED = "Couldn't save your name. Try again.";
export const CLERK_NAME_PARAM_UNKNOWN = 'form_param_unknown';
export const CLERK_NAME_MAX_LENGTH = 'form_param_max_length_exceeded';

type ClerkFieldError = {
  code?: string;
  message?: string;
  longMessage?: string;
};

type ClerkLikeError = {
  clerkError?: boolean;
  errors?: ClerkFieldError[];
  message?: string;
  code?: string;
  name?: string;
  cause?: unknown;
};

const NETWORK_RE =
  /network request failed|failed to fetch|network error|internet|offline|load failed|econnrefused|enotfound|etimedout|econnreset|fetch failed|net::err_/i;

/** Trim ends and collapse repeated whitespace to a single space. */
export function normalizeProfileName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isFirstNameMissing(firstName: string): boolean {
  return normalizeProfileName(firstName).length === 0;
}

export function hasProfileNameChanged(
  firstName: string,
  lastName: string,
  originalFirstName: string,
  originalLastName: string
): boolean {
  return (
    normalizeProfileName(firstName) !== normalizeProfileName(originalFirstName) ||
    normalizeProfileName(lastName) !== normalizeProfileName(originalLastName)
  );
}

export function canSaveProfileName(
  firstName: string,
  lastName: string,
  originalFirstName: string,
  originalLastName: string
): boolean {
  return (
    !isFirstNameMissing(firstName) &&
    hasProfileNameChanged(firstName, lastName, originalFirstName, originalLastName)
  );
}

/** Last name is optional and sent as `""` when blank. */
export function profileNamePayload(
  firstName: string,
  lastName: string
): { firstName: string; lastName: string } {
  return {
    firstName: normalizeProfileName(firstName),
    lastName: normalizeProfileName(lastName),
  };
}

/**
 * Row label from first + last only — never `fullName`, so a cleared last name
 * cannot linger as a stale full name.
 */
export function displayProfileName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const first = normalizeProfileName(firstName ?? '');
  const last = normalizeProfileName(lastName ?? '');
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || PROFILE_NAME_UNSIGNED;
}

export function profileNameA11yLabel(name: string): string {
  return `Name, ${name}. Double-tap to edit.`;
}

function asRecord(value: unknown): ClerkLikeError | null {
  return typeof value === 'object' && value !== null ? (value as ClerkLikeError) : null;
}

function clerkFieldErrors(error: unknown): ClerkFieldError[] {
  const record = asRecord(error);
  if (!record || !Array.isArray(record.errors)) return [];
  return record.errors.filter((entry) => typeof entry === 'object' && entry !== null);
}

export function isProfileNameNetworkError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === 'string') return NETWORK_RE.test(error);

  const record = asRecord(error);
  if (!record) return false;
  if (typeof record.message === 'string' && NETWORK_RE.test(record.message)) return true;
  if (typeof record.code === 'string' && NETWORK_RE.test(record.code)) return true;
  if (record.name === 'TypeError' && typeof record.message === 'string' && NETWORK_RE.test(record.message)) {
    return true;
  }
  if (record.cause !== undefined && record.cause !== record) {
    return isProfileNameNetworkError(record.cause);
  }
  return false;
}

function isClerkValidationCode(code: string | undefined): boolean {
  if (!code) return false;
  if (code === CLERK_NAME_PARAM_UNKNOWN) return false;
  return code === CLERK_NAME_MAX_LENGTH || code.startsWith('form_');
}

function clerkMessage(entry: ClerkFieldError): string {
  const long = entry.longMessage?.trim() ?? '';
  if (long) return long;
  return entry.message?.trim() ?? '';
}

/** User-facing copy for a failed `user.update`. Sheet stays open. */
export function profileNameSaveError(error: unknown): string {
  if (isProfileNameNetworkError(error)) return PROFILE_NAME_OFFLINE;

  const fields = clerkFieldErrors(error);
  const unknown = fields.find((entry) => entry.code === CLERK_NAME_PARAM_UNKNOWN);
  if (unknown) {
    console.log('Clerk form_param_unknown while saving profile name', error);
    return PROFILE_NAME_FAILED;
  }

  const validation = fields.find((entry) => isClerkValidationCode(entry.code));
  if (validation) {
    const text = clerkMessage(validation);
    if (text) return text;
  }

  return PROFILE_NAME_FAILED;
}
