import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const continueAsGuest = useStore((s) => s.continueAsGuest);
  const [busy, setBusy] = useState(false);

  async function guest() {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest();
      router.replace('/(tabs)');
    } catch {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <MaterialCommunityIcons name="anvil" size={52} color={palette.accent} />
        </View>
        <Text style={styles.word}>ANVIL</Text>
        <Text style={styles.tag}>turn sweat into muscle</Text>
        <Text style={styles.by}>by PeteKovSoftware</Text>
      </View>

      <View style={styles.stack}>
        <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'create' } })} style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>Create account</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
          <Text style={styles.outlineText}>Sign in</Text>
        </Pressable>
        <Pressable onPress={guest} disabled={busy} style={styles.ghost}>
          {busy ? (
            <ActivityIndicator color={palette.textMuted} />
          ) : (
            <Text style={styles.ghostText}>Continue as <Text style={styles.ghostStrong}>guest</Text></Text>
          )}
        </Pressable>
        <Text style={styles.note}>Train free for 14 days. Link an email later and keep every set — nothing is lost.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.lg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 96, height: 96, borderRadius: radius.lg, backgroundColor: palette.accentDim, borderWidth: 1, borderColor: 'rgba(196,248,42,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  word: { color: palette.text, fontSize: 46, fontWeight: '900', letterSpacing: 8, marginLeft: 8 },
  tag: { color: palette.accent, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  by: { color: palette.textFaint, fontSize: 12.5, fontWeight: '600', marginTop: 6, letterSpacing: 0.5 },
  stack: { gap: spacing.md },
  btn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: palette.accent },
  primaryText: { color: palette.accentDark, fontSize: 16, fontWeight: '900' },
  outline: { borderWidth: 1.5, borderColor: palette.accent },
  outlineText: { color: palette.accent, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  ghost: { alignItems: 'center', paddingVertical: spacing.sm },
  ghostText: { color: palette.textMuted, fontSize: 14, fontWeight: '600' },
  ghostStrong: { color: palette.text, fontWeight: '800' },
  note: { color: palette.textFaint, fontSize: 12, textAlign: 'center', lineHeight: 17, paddingHorizontal: spacing.md },
});
