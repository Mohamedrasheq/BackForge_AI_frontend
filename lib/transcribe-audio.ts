function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function audioPartFromUri(uri: string, platform?: string): { name: string; type: string } {
  const path = uri.split('?')[0].toLowerCase();
  if (
    path.endsWith('.webm') ||
    (platform === 'web' && (path.startsWith('blob:') || path.startsWith('data:')))
  ) {
    return { name: 'capture.webm', type: 'audio/webm' };
  }
  if (path.endsWith('.wav')) return { name: 'capture.wav', type: 'audio/wav' };
  if (path.endsWith('.caf')) return { name: 'capture.caf', type: 'audio/x-caf' };
  if (path.endsWith('.mp4')) return { name: 'capture.m4a', type: 'audio/mp4' };
  return { name: 'capture.m4a', type: 'audio/m4a' };
}

export function readTranscriptPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  for (const value of [payload.text, payload.transcript]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
