import { REMINDER_NOT_NOW, REMINDER_TURN_ON } from './reminder-nudge';

export const ONBOARDING_CONTINUE = 'Continue';
export const NUDGE_ART_HALO_SIZE = 260;
export const NUDGE_ART_BELL = 'bell';

export type OnboardingCta = {
  primaryLabel: string;
  secondaryLabel: string;
  secondaryVisible: boolean;
  /** Always true so the pager does not shrink on the last page. */
  reserveSecondary: true;
};

export function onboardingCta(isLastPage: boolean): OnboardingCta {
  return {
    primaryLabel: isLastPage ? REMINDER_TURN_ON : ONBOARDING_CONTINUE,
    secondaryLabel: REMINDER_NOT_NOW,
    secondaryVisible: isLastPage,
    reserveSecondary: true,
  };
}

/** Entrance animation for NudgeArt / DatedCard. */
export function artEntryMotion(active: boolean, reduceMotion: boolean): {
  play: boolean;
  settled: boolean;
} {
  if (!active) return { play: false, settled: false };
  if (reduceMotion) return { play: false, settled: true };
  return { play: true, settled: false };
}
