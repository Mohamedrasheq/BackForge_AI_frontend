/** Public pages on the BackForge site. */
const SITE_URL = 'https://back-forge-ai.vercel.app';
const PRIVACY_URL = `${SITE_URL}/privacy`;
const TERMS_URL = `${SITE_URL}/terms`;
const SUPPORT_URL = `${SITE_URL}/support`;

export const LEGAL_LINKS = [
  { label: 'Privacy', url: PRIVACY_URL },
  { label: 'Terms', url: TERMS_URL },
  { label: 'Support', url: SUPPORT_URL },
] as const;
