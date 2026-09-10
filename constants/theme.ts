/**
 * Motyw "Anvil" — ciemny, jeden akcent marki (neon green).
 * Bez kolorów per-dzień (to był artefakt plakatu referencyjnego).
 */

export const palette = {
  // Tła i powierzchnie
  bg: '#0E1512',
  surface: '#151E1A',
  card: '#1A2621',
  cardAlt: '#22302A',
  border: '#2A3A33',

  // Tekst
  text: '#EDF3EF',
  textMuted: '#8CA398',
  textFaint: '#5E7268',

  // Akcent marki — neon green, jedyny kolor akcentu w całej apce
  accent: '#C4F82A',
  accentDark: '#0E1512', // tekst na akcencie
  accentDim: 'rgba(196, 248, 42, 0.14)',

  danger: '#EF4444',
  success: '#C4F82A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

/** Polskie etykiety partii mięśniowych (klucze zgodne z `muscleGroup` w Firestore). */
export const muscleLabelPl: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  'rear-delts': 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  'posterior-chain': 'Posterior chain',
  core: 'Core',
};

export function muscleLabel(group: string): string {
  return muscleLabelPl[group] ?? group;
}
