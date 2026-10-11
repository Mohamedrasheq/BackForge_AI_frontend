import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BAR_COUNT,
  BAR_GAP,
  BAR_WIDTH,
  HEIGHT_MIN,
  IDLE_HEIGHTS_OUTER_TO_INNER,
  MIC_GAP,
  MIC_SIZE,
  barJitter,
  barLeft,
  barOpacity,
  emptyLevels,
  haloScale,
  idleHeightFromInner,
  levelToHeight,
  normalizeMetering,
  outwardFade,
  pushLevel,
  recordingBarHeight,
  reducedRecordingHeight,
  reducedRecordingScale,
  shimmerGlow,
  shimmerOpacity,
  shouldCommitReducedFrame,
  smoothLevel,
} from './voice-wave';

describe('normalizeMetering', () => {
  it('clamps dBFS to [-55, 0] and maps the ends to 0 and 1', () => {
    assert.equal(normalizeMetering(-160), 0);
    assert.equal(normalizeMetering(-55), 0);
    assert.equal(normalizeMetering(-56), 0);
    assert.equal(normalizeMetering(0), 1);
    assert.equal(normalizeMetering(6), 1);
    assert.equal(normalizeMetering(Number.NaN), 0);
  });

  it('applies the 0.6 curve so quiet speech sits above a linear map', () => {
    const db = -40;
    const linear = (db - -55) / 55;
    const curved = normalizeMetering(db);
    assert.ok(Math.abs(curved - Math.pow(linear, 0.6)) < 1e-12);
    assert.ok(curved > linear);
  });

  it('is monotonic from silence to full scale', () => {
    assert.ok(normalizeMetering(-50) < normalizeMetering(-27.5));
    assert.ok(normalizeMetering(-27.5) < normalizeMetering(-10));
    assert.ok(Math.abs(normalizeMetering(-27.5) - Math.pow(0.5, 0.6)) < 1e-12);
  });
});

describe('smoothLevel', () => {
  it('attacks at 0.55 when the level rises', () => {
    assert.ok(Math.abs(smoothLevel(0, 1) - 0.55) < 1e-12);
  });

  it('releases at 0.18 when the level falls', () => {
    assert.ok(Math.abs(smoothLevel(1, 0) - 0.82) < 1e-12);
  });

  it('rises faster than it falls across the same gap', () => {
    const upDelta = smoothLevel(0.2, 0.8) - 0.2;
    const downDelta = 0.8 - smoothLevel(0.8, 0.2);
    assert.ok(upDelta > downDelta);
  });
});

describe('levelToHeight', () => {
  it('holds the 4pt floor below 0.04 and maps 1 to 40pt', () => {
    assert.equal(levelToHeight(0), HEIGHT_MIN);
    assert.equal(levelToHeight(0.039), HEIGHT_MIN);
    assert.ok(Math.abs(levelToHeight(0.04) - (4 + 0.04 * 36)) < 1e-12);
    assert.equal(levelToHeight(0.5), 22);
    assert.equal(levelToHeight(1), 40);
  });
});

describe('recordingBarHeight', () => {
  it('does not jitter the silence floor', () => {
    for (let i = 0; i < BAR_COUNT; i++) {
      assert.equal(recordingBarHeight(0, i, 0), HEIGHT_MIN);
      assert.equal(recordingBarHeight(0.039, i, 1), HEIGHT_MIN);
    }
  });

  it('keeps seeded jitter inside ±8% and inside the 4–40pt range', () => {
    let sidesDiffer = false;
    for (let i = 0; i < BAR_COUNT; i++) {
      const left = barJitter(i, 0);
      const right = barJitter(i, 1);
      assert.equal(barJitter(i, 0), left);
      assert.ok(left >= -0.08 && left <= 0.08);
      assert.ok(right >= -0.08 && right <= 0.08);
      if (left !== right) sidesDiffer = true;

      const mid = recordingBarHeight(0.5, i, 0);
      const base = 22;
      assert.ok(Math.abs(mid - base) <= base * 0.08 + 1e-9);
      const full = recordingBarHeight(1, i, 1);
      assert.ok(full >= HEIGHT_MIN && full <= 40);
    }
    assert.equal(sidesDiffer, true);
  });
});

describe('idle pattern', () => {
  it('mirrors the outer-to-inner heights', () => {
    const left = Array.from({ length: BAR_COUNT }, (_, outer) => idleHeightFromInner(BAR_COUNT - 1 - outer));
    assert.deepEqual(left, [...IDLE_HEIGHTS_OUTER_TO_INNER]);
    const right = Array.from({ length: BAR_COUNT }, (_, inner) => idleHeightFromInner(inner));
    assert.deepEqual(right, [...IDLE_HEIGHTS_OUTER_TO_INNER].reverse());
  });
});

describe('reducedRecordingHeight', () => {
  it('keeps the idle pattern at silence and lifts the peak to 40pt at full level', () => {
    assert.equal(reducedRecordingScale(0), 1);
    assert.equal(reducedRecordingHeight(14, 0), 14);
    assert.equal(reducedRecordingHeight(4, 0), 4);
    assert.ok(Math.abs(reducedRecordingHeight(14, 1) - 40) < 1e-9);
  });

  it('scales every bar by the same factor', () => {
    const level = 0.4;
    const scale = reducedRecordingScale(level);
    assert.ok(Math.abs(reducedRecordingHeight(4, level) / 4 - scale) < 1e-12);
    assert.ok(Math.abs(reducedRecordingHeight(14, level) / 14 - scale) < 1e-12);
    assert.ok(
      Math.abs(reducedRecordingHeight(14, level) / reducedRecordingHeight(4, level) - 14 / 4) < 1e-9
    );
  });
});

describe('shouldCommitReducedFrame', () => {
  it('commits the first sample and then waits 250ms', () => {
    assert.equal(shouldCommitReducedFrame(1_000, 0), true);
    assert.equal(shouldCommitReducedFrame(1_249, 1_000), false);
    assert.equal(shouldCommitReducedFrame(1_250, 1_000), true);
  });
});

describe('pushLevel', () => {
  it('inserts the newest level next to the mic and shifts older levels outward', () => {
    const start = emptyLevels();
    const first = pushLevel(start, 0.5);
    assert.equal(first[0], 0.5);
    assert.equal(first[1], 0);
    assert.equal(first.length, BAR_COUNT);
    assert.deepEqual(start, emptyLevels());

    const second = pushLevel(first, 0.8);
    assert.equal(second[0], 0.8);
    assert.equal(second[1], 0.5);
    assert.equal(second[2], 0);
  });
});

describe('outwardFade', () => {
  it('fades from 1 at the mic to 0.35 at the outer edge', () => {
    assert.equal(outwardFade(0), 1);
    assert.ok(Math.abs(outwardFade(BAR_COUNT - 1) - 0.35) < 1e-12);
    assert.ok(outwardFade(1) < outwardFade(0));
    assert.ok(outwardFade(BAR_COUNT - 1) < outwardFade(BAR_COUNT - 2));
  });
});

describe('shimmer', () => {
  it('parks the highlight on the outer bar at phase 0 and the inner bar at phase 1', () => {
    for (let i = 0; i < BAR_COUNT; i++) {
      assert.ok(shimmerGlow(0, BAR_COUNT - 1) >= shimmerGlow(0, i));
      assert.ok(shimmerGlow(1, 0) >= shimmerGlow(1, i));
    }
    assert.ok(shimmerGlow(0, BAR_COUNT - 1) > shimmerGlow(0, 0));
    assert.ok(shimmerGlow(1, 0) > shimmerGlow(1, BAR_COUNT - 1));
  });

  it('keeps pulsed opacity inside the fade times 0.35–0.9', () => {
    for (let i = 0; i < BAR_COUNT; i++) {
      const fade = outwardFade(i);
      for (let step = 0; step <= 10; step++) {
        const opacity = shimmerOpacity(step / 10, i);
        assert.ok(opacity >= fade * 0.35 - 1e-9);
        assert.ok(opacity <= fade * 0.9 + 1e-9);
      }
    }
  });

  it('uses a flat 50% opacity for Reduce Motion transcribing', () => {
    assert.equal(barOpacity('transcribing', true, 0.4, 0, 1), 0.5);
    assert.equal(barOpacity('idle', false, 0.2, 3, 0), outwardFade(3));
    assert.equal(barOpacity('recording', true, 0.2, 3, 1), outwardFade(3));
  });
});

describe('haloScale', () => {
  it('runs from 1 to 1.18 with the smoothed level', () => {
    assert.equal(haloScale(0), 1);
    assert.ok(Math.abs(haloScale(1) - 1.18) < 1e-12);
    assert.ok(Math.abs(haloScale(0.5) - 1.09) < 1e-12);
  });
});

describe('barLeft', () => {
  it('leaves a 12pt gap between the innermost bar and the mic', () => {
    const center = 200;
    const left = barLeft(center, 0, 0);
    assert.equal(center - MIC_SIZE / 2 - (left + BAR_WIDTH), MIC_GAP);
    const right = barLeft(center, 0, 1);
    assert.equal(right - (center + MIC_SIZE / 2), MIC_GAP);
  });

  it('spaces bars by the 4pt gap', () => {
    const first = barLeft(100, 0, 1);
    const second = barLeft(100, 1, 1);
    assert.equal(second - (first + BAR_WIDTH), BAR_GAP);
  });
});
