import type { Timestamp } from 'firebase/firestore';

/** Długość darmowego okresu gościa (dni). */
export const TRIAL_DAYS = 14;

const DAY_MS = 86_400_000;

/**
 * Ile dni triala zostało gościowi (liczone od `createdAt`).
 * 0 = okres minął. Konta (nie-goście) nie mają limitu w Etapie 1.
 */
export function guestDaysLeft(createdAt?: Timestamp | null): number {
  if (!createdAt) return TRIAL_DAYS;
  const elapsed = Date.now() - createdAt.toMillis();
  return Math.max(0, TRIAL_DAYS - Math.floor(elapsed / DAY_MS));
}
