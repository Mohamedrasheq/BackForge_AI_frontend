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

export type SignedInRoute =
  | { kind: 'wait' }
  | { kind: 'stay' }
  | { kind: 'redirect'; to: '/ai-consent' | '/(tabs)' };

const SIGNED_IN_ROUTES = new Set(['(tabs)', 'review', 'category']);

/**
 * Where a signed-in user belongs, given the first route segment and their consent.
 * The AI notice comes before every signed-in screen, so Capture and Ask never need their own gate.
 * `loading` waits on the boot spinner; the consent store falls back to `needed` within 1.5s.
 * The notice screen leaves on its own (see `aiConsentNoticeDone`), so the layout never redirects
 * off it; two replaces at once would mount the tabs twice.
 */
export function signedInRoute(route: string | undefined, status: AiConsentStatus): SignedInRoute {
  if (status === 'loading') return { kind: 'wait' };
  if (route === 'ai-consent') return { kind: 'stay' };
  if (status === 'needed') return { kind: 'redirect', to: '/ai-consent' };
  return route && SIGNED_IN_ROUTES.has(route) ? { kind: 'stay' } : { kind: 'redirect', to: '/(tabs)' };
}

/**
 * Whether the notice screen should hand over to the tabs.
 * `agreedHere` is the screen's own record of the Agree tap, so closing never waits on the store.
 * `agreed` alone covers a stored agreement that arrives after the 1.5s fallback.
 */
export function aiConsentNoticeDone(status: AiConsentStatus, agreedHere: boolean): boolean {
  return agreedHere || status === 'agreed';
}
