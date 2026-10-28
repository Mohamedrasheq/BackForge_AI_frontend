/**
 * Confirm and Ask edit cards: how due metadata stacks.
 * The category chip used to share the date row when a short name fit; it
 * always occupies its own line under the date pill + Clear instead.
 * Time chips stay below both so they stay attached to the time control.
 */

export type DueMetaSlot = 'date' | 'accessory' | 'timeChips';

/** Short and long category names both wrap; nothing sits inline with the date. */
export function categoryChipSharesDueRow(_label = ''): boolean {
  return false;
}

/**
 * Vertical order of due metadata on Confirm / Ask edit cards.
 * The category accessory is never inlined onto the date row.
 */
export function dueMetaOrder(options: {
  hasAccessory: boolean;
  showTimeChips: boolean;
}): DueMetaSlot[] {
  const slots: DueMetaSlot[] = ['date'];
  if (options.hasAccessory) slots.push('accessory');
  if (options.showTimeChips) slots.push('timeChips');
  return slots;
}
