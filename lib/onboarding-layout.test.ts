import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  NUDGE_ART_BELL,
  NUDGE_ART_HALO_SIZE,
  ONBOARDING_CONTINUE,
  artEntryMotion,
  onboardingCta,
} from './onboarding-layout';
import { REMINDER_NOT_NOW, REMINDER_TURN_ON } from './reminder-nudge';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('onboarding footer', () => {
  it('keeps a reserved second row so height is constant across pages', () => {
    const early = onboardingCta(false);
    const last = onboardingCta(true);
    assert.equal(early.reserveSecondary, true);
    assert.equal(last.reserveSecondary, true);
    assert.equal(early.secondaryLabel, last.secondaryLabel);
    assert.equal(early.secondaryVisible, false);
    assert.equal(last.secondaryVisible, true);
    assert.equal(early.primaryLabel, ONBOARDING_CONTINUE);
    assert.equal(last.primaryLabel, REMINDER_TURN_ON);
    assert.equal(last.secondaryLabel, REMINDER_NOT_NOW);
    const src = source('app/onboarding.tsx');
    assert.match(src, /styles\.ctaStack/);
    assert.match(src, /ctaReserve/);
    assert.match(src, /onboardingCta\(isLastPage\)/);
  });
});

describe('NudgeArt', () => {
  it('renders with an active prop and the shared 260 halo plus bell', () => {
    assert.equal(NUDGE_ART_HALO_SIZE, 260);
    assert.equal(NUDGE_ART_BELL, 'bell');
    assert.deepEqual(artEntryMotion(true, false), { play: true, settled: false });
    assert.deepEqual(artEntryMotion(true, true), { play: false, settled: true });
    assert.deepEqual(artEntryMotion(false, false), { play: false, settled: false });
    const src = source('components/onboarding/page-art.tsx');
    assert.match(src, /export function NudgeArt\(\{ active \}/);
    assert.match(src, /styles\.halo/);
    assert.match(src, /DatedCard/);
    assert.match(source('app/onboarding.tsx'), /NudgeArt active=\{active\}/);
  });
});
