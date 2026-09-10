import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface Props {
  /** Zmień wartość (np. Date.now()), by (od)startować odliczanie. */
  nonce: number;
  /** Długość przerwy w sekundach (domyślnie 90). */
  duration?: number;
  /** „Skip"/„Dismiss" — chowa timer. */
  onDismiss: () => void;
}

/**
 * Rest timer między seriami. Startuje po odklinięciu serii (przez zmianę `nonce`),
 * liczy w dół. Po dojściu do zera NIC się nie dzieje — brak kary/alarmu, tylko
 * napis „Rest done". Zawsze pomijalny.
 */
export default function RestTimer({ nonce, duration = 90, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const endRef = useRef<number>(Date.now() + duration * 1000);

  useEffect(() => {
    endRef.current = Date.now() + duration * 1000;
    setRemaining(duration);
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [nonce, duration]);

  const done = remaining <= 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <View style={[styles.bar, done && styles.barDone]}>
      <MaterialCommunityIcons
        name={done ? 'check-circle-outline' : 'timer-sand'}
        size={18}
        color={done ? palette.textMuted : palette.accent}
      />
      <Text style={styles.label}>Rest</Text>
      <Text style={[styles.time, done && styles.timeDone]}>
        {done ? 'done' : `${mm}:${String(ss).padStart(2, '0')}`}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8} style={styles.skip}>
        <Text style={styles.skipText}>{done ? 'Dismiss' : 'Skip'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  barDone: { borderColor: palette.border, backgroundColor: palette.card },
  label: { color: palette.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  time: { color: palette.accent, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'], flex: 1 },
  timeDone: { color: palette.textMuted, fontSize: 15 },
  skip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: palette.card },
  skipText: { color: palette.text, fontSize: 13, fontWeight: '800' },
});
