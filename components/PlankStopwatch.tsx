import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

interface Props {
  /** Zapisuje wykonany hold (w sekundach) jako serię. */
  onSave: (seconds: number) => void;
  /** Trwa zapis serii (blokuje ponowne kliknięcie). */
  saving?: boolean;
  /** Najlepszy dotychczasowy hold (sekundy) — pokazywany jako cel. */
  best?: number;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Stoper planku (count-up). Ćwiczący wciska „Start hold", trzyma dopóki daje radę,
 * i „Stop & save" zapisuje sekundy jako serię. Zastępuje ręczne wpisywanie czasu na
 * ćwiczeniach `timed` — koniec z wychodzeniem z apki po zewnętrzny stoper.
 */
export default function PlankStopwatch({ onSave, saving, best }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    setElapsed(0);
    setRunning(true);
  }

  function stop() {
    const secs = Math.floor((Date.now() - startRef.current) / 1000);
    setRunning(false);
    setElapsed(0);
    if (secs > 0) onSave(secs);
  }

  if (!running) {
    return (
      <Pressable onPress={start} style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="play" size={24} color={palette.accentDark} />
        <Text style={styles.startText}>Start hold</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.dial}>
        <Text style={styles.dialTime}>{fmt(elapsed)}</Text>
        <Text style={styles.dialLabel}>elapsed</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="play-circle-outline" size={14} color={palette.accent} />
          <Text style={styles.statusText}>
            Running{best ? ` · best ${fmt(best)}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={stop}
          disabled={saving}
          style={({ pressed }) => [styles.stopBtn, saving && styles.pressed, pressed && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator color={palette.accentDark} />
          ) : (
            <>
              <MaterialCommunityIcons name="stop" size={20} color={palette.accentDark} />
              <Text style={styles.stopText}>Stop &amp; save</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
  },
  startText: { color: palette.accentDark, fontSize: 17, fontWeight: '800' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  dial: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialTime: {
    color: palette.accent,
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  dialLabel: { color: palette.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  right: { flex: 1, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: palette.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: palette.accent,
  },
  stopText: { color: palette.accentDark, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
