import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';

export default function Upgrade() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <MaterialCommunityIcons name="lock-outline" size={44} color={palette.accent} />
          </View>
          <Text style={styles.title}>Your 14-day trial has ended</Text>
          <Text style={styles.body}>
            Create a free account to keep training — every set, plan and chart you logged is safe and
            waiting. Sign back in on any device and it all loads.
          </Text>
        </View>

        <View style={styles.stack}>
          <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'create' } })} style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Create account</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
            <Text style={styles.outlineText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.lg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: palette.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { color: palette.text, fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 32 },
  body: { color: palette.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.sm },
  stack: { gap: spacing.md },
  btn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: palette.accent },
  primaryText: { color: palette.accentDark, fontSize: 16, fontWeight: '900' },
  outline: { borderWidth: 1.5, borderColor: palette.accent },
  outlineText: { color: palette.accent, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
