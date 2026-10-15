/** Public pages on the BackForge site. */
export const SITE_URL = 'https://back-forge-ai.vercel.app';
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const TERMS_URL = `${SITE_URL}/terms`;
export const SUPPORT_URL = `${SITE_URL}/support`;

export const LEGAL_LINKS = [
  { label: 'Privacy', url: PRIVACY_URL },
  { label: 'Terms', url: TERMS_URL },
  { label: 'Support', url: SUPPORT_URL },
] as const;
