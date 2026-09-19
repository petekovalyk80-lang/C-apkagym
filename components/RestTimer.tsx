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
 * napis „Rest done". Zawsze pomijalny. Duży i czytelny z podłogi (telefon obok stanowiska).
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
  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons
            name={done ? 'check-circle-outline' : 'timer-sand'}
            size={16}
            color={done ? palette.textMuted : palette.accent}
          />
          <Text style={styles.label}>{done ? 'Rest done' : 'Rest'}</Text>
        </View>
        <Text style={[styles.time, done && styles.timeDone]}>
          {done ? 'Ready' : `${mm}:${String(ss).padStart(2, '0')}`}
        </Text>
        {!done && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        )}
      </View>
      <Pressable onPress={onDismiss} hitSlop={8} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
        <Text style={styles.skipText}>{done ? 'Dismiss' : 'Skip'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  cardDone: { borderColor: palette.border, backgroundColor: palette.card },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: palette.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  time: {
    color: palette.accent,
    fontSize: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 48,
    marginTop: 2,
  },
  timeDone: { color: palette.textMuted, fontSize: 24, lineHeight: 30 },
  track: { height: 5, borderRadius: 3, backgroundColor: palette.cardAlt, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: palette.accent },
  skip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: palette.accent,
  },
  skipText: { color: palette.accentDark, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
