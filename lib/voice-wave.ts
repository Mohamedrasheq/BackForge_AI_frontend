/**
 * Pure waveform math for the Capture voice row.
 * Worklet directives let the UI thread call these without a React render.
 */

export const BAR_COUNT = 14;
export const BAR_WIDTH = 3;
export const BAR_GAP = 4;
export const BAR_RADIUS = 1.5;
export const MIC_SIZE = 64;
export const MIC_GAP = 12;
export const ROW_HEIGHT = 56;
/** How far the 64pt mic extends past the 56pt strip, on each side. */
export const ROW_BLEED = (MIC_SIZE - ROW_HEIGHT) / 2;

export const DB_MIN = -55;
export const DB_MAX = 0;
export const LEVEL_CURVE = 0.6;
export const ATTACK = 0.55;
export const RELEASE = 0.18;
export const LEVEL_FLOOR = 0.04;
export const HEIGHT_MIN = 4;
export const HEIGHT_MAX = 40;
export const HEIGHT_RANGE = HEIGHT_MAX - HEIGHT_MIN;
export const TRANSCRIBE_HEIGHT = 8;
export const REDUCED_MOTION_INTERVAL_MS = 250;
export const SHIMMER_PERIOD_MS = 1400;
export const IDLE_PEAK = 14;

export const IDLE_BAR_COLOR = '#D1D5DB';
export const LIVE_BAR_COLOR = '#B45309';
export const MIC_BORDER_COLOR = '#E5E7EB';
export const HALO_OPACITY = 0.15;
export const HALO_SCALE = 0.18;
export const TRANSCRIBING_MIC_OPACITY = 0.4;
export const REDUCED_TRANSCRIBE_OPACITY = 0.5;

/** Outer edge → mic. Mirrored on the other side. */
export const IDLE_HEIGHTS_OUTER_TO_INNER = [
  4, 6, 8, 6, 10, 7, 12, 9, 14, 10, 12, 8, 6, 4,
] as const;

export type WaveMode = 'idle' | 'recording' | 'transcribing';

export function normalizeMetering(db: number): number {
  'worklet';
  if (!Number.isFinite(db)) return 0;
  const clamped = Math.min(DB_MAX, Math.max(DB_MIN, db));
  const n = (clamped - DB_MIN) / (DB_MAX - DB_MIN);
  return Math.pow(n, LEVEL_CURVE);
}

export function smoothLevel(previous: number, next: number): number {
  'worklet';
  const alpha = next > previous ? ATTACK : RELEASE;
  const value = previous + alpha * (next - previous);
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Live bar height before per-bar jitter. Silence under the floor stays at 4pt. */
export function levelToHeight(level: number): number {
  'worklet';
  if (!(level >= LEVEL_FLOOR)) return HEIGHT_MIN;
  return HEIGHT_MIN + level * HEIGHT_RANGE;
}

/** Stable ±8% so the two sides are not a perfect copy, and frames do not reshuffle. */
export function barJitter(indexFromInner: number, side: number): number {
  'worklet';
  const x = Math.sin((indexFromInner + 1) * 12.9898 + side * 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac * 2 - 1) * 0.08;
}

export function recordingBarHeight(level: number, indexFromInner: number, side: number): number {
  'worklet';
  const base = levelToHeight(level);
  if (!(level >= LEVEL_FLOOR)) return base;
  const height = base * (1 + barJitter(indexFromInner, side));
  if (height < HEIGHT_MIN) return HEIGHT_MIN;
  if (height > HEIGHT_MAX) return HEIGHT_MAX;
  return height;
}

export function idleHeightFromInner(indexFromInner: number): number {
  'worklet';
  const outerIndex = IDLE_HEIGHTS_OUTER_TO_INNER.length - 1 - indexFromInner;
  return IDLE_HEIGHTS_OUTER_TO_INNER[outerIndex] ?? HEIGHT_MIN;
}

/**
 * Reduce Motion keeps the idle shape and scales it with one factor.
 * Silence (level 0) is the idle pattern; full level lifts the tallest bar to 40pt.
 */
export function reducedRecordingScale(level: number): number {
  'worklet';
  const clamped = level < 0 ? 0 : level > 1 ? 1 : level;
  return 1 + clamped * (HEIGHT_MAX / IDLE_PEAK - 1);
}

export function reducedRecordingHeight(idlePt: number, level: number): number {
  'worklet';
  return idlePt * reducedRecordingScale(level);
}

export function shouldCommitReducedFrame(
  now: number,
  lastCommit: number,
  interval = REDUCED_MOTION_INTERVAL_MS
): boolean {
  'worklet';
  return lastCommit === 0 || now - lastCommit >= interval;
}

/** Index 0 is the newest sample, drawn next to the mic. */
export function pushLevel(history: readonly number[], level: number): number[] {
  'worklet';
  const next = new Array<number>(BAR_COUNT);
  next[0] = level;
  for (let i = 1; i < BAR_COUNT; i++) next[i] = history[i - 1] ?? 0;
  return next;
}

export function emptyLevels(): number[] {
  'worklet';
  const levels = new Array<number>(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) levels[i] = 0;
  return levels;
}

/** 1 next to the mic, 0.35 at the outer edge. */
export function outwardFade(indexFromInner: number, count = BAR_COUNT): number {
  'worklet';
  if (count <= 1) return 1;
  const t = indexFromInner / (count - 1);
  return 1 - t * (1 - 0.35);
}

/** 0..1 highlight. Phase 0 sits on the outer bar and phase 1 sits on the inner bar. */
export function shimmerGlow(phase: number, indexFromInner: number, count = BAR_COUNT): number {
  'worklet';
  const denom = Math.max(1, count - 1);
  const t = phase < 0 ? 0 : phase > 1 ? 1 : phase;
  const barFromOuter = (denom - indexFromInner) / denom;
  const dist = Math.abs(barFromOuter - t);
  const sigma = 1.15 / denom;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

/** Outward fade × a 0.35–0.9 pulse, so the highlight travels inward without losing the fade. */
export function shimmerOpacity(phase: number, indexFromInner: number): number {
  'worklet';
  const fade = outwardFade(indexFromInner);
  const pulse = 0.35 + (0.9 - 0.35) * shimmerGlow(phase, indexFromInner);
  return fade * pulse;
}

export function barOpacity(
  mode: WaveMode,
  reduceMotion: boolean,
  phase: number,
  indexFromInner: number,
  shimmerMix: number
): number {
  'worklet';
  if (mode === 'transcribing' && reduceMotion) return REDUCED_TRANSCRIBE_OPACITY;
  const fade = outwardFade(indexFromInner);
  const mix = reduceMotion ? 0 : Math.min(1, Math.max(0, shimmerMix));
  if (mix === 0) return fade;
  const pulsed = shimmerOpacity(phase, indexFromInner);
  return fade + (pulsed - fade) * mix;
}

export function haloScale(level: number): number {
  'worklet';
  const clamped = level < 0 ? 0 : level > 1 ? 1 : level;
  return 1 + clamped * HALO_SCALE;
}

/** Left edge of a bar. Side 0 is left of the mic, side 1 is right. */
export function barLeft(centerX: number, indexFromInner: number, side: 0 | 1): number {
  const innerEdge = MIC_SIZE / 2 + MIC_GAP;
  const offset = innerEdge + indexFromInner * (BAR_WIDTH + BAR_GAP);
  if (side === 1) return centerX + offset;
  return centerX - offset - BAR_WIDTH;
}
