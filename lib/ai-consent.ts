/**
 * One-time agreement that task text and voice go to OpenAI.
 * Stored on the device per Clerk user id, so another account on the same phone is asked again.
 */

export const AI_CONSENT_TEXT =
  'BackForge uses OpenAI to break down your tasks and answer your questions. Your task text and voice are sent to OpenAI for this.';
export const AI_CONSENT_AGREE = 'Agree';
export const AI_CONSENT_PRIVACY = 'Privacy';

const KEY_PREFIX = 'backforge.aiConsent.';
const AGREED_VALUE = 'agreed';

export type AiConsentStatus = 'loading' | 'needed' | 'agreed';

/** AsyncStorage key for one user. Null without a signed-in user. */
export function aiConsentStorageKey(userId: string | null | undefined): string | null {
  const id = userId?.trim();
  return id ? `${KEY_PREFIX}${id}` : null;
}

export function aiConsentStoredValue(): string {
  return AGREED_VALUE;
}

export function isAiConsentStored(raw: string | null | undefined): boolean {
  return raw === AGREED_VALUE;
}
