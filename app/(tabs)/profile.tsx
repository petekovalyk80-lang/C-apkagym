import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { guestDaysLeft, TRIAL_DAYS } from '@/lib/trial';
import { useStore } from '@/store/useStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isAnonymous = useStore((s) => s.isAnonymous);
  const email = useStore((s) => s.email);
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);
  const [busy, setBusy] = useState(false);

  const daysLeft = guestDaysLeft(user?.createdAt);

  async function doSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      router.replace('/welcome');
    } catch {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg }}
    >
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name={isAnonymous ? 'account-outline' : 'account-check'} size={30} color={palette.accent} />
        </View>
        {isAnonymous ? (
          <>
            <Text style={styles.status}>Guest</Text>
            <Text style={styles.statusSub}>
              {daysLeft > 0 ? `${daysLeft} of ${TRIAL_DAYS} trial days left` : 'Your free trial has ended'}
            </Text>
            <View style={styles.trialBar}>
              <View style={[styles.trialFill, { width: `${(daysLeft / TRIAL_DAYS) * 100}%` }]} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.status}>Signed in</Text>
            <Text style={styles.statusSub}>{email ?? 'Your account'}</Text>
          </>
        )}
      </View>

      {isAnonymous ? (
        <>
          <Text style={styles.hint}>Create a free account to keep your history and train on any device — your guest data comes with you.</Text>
          <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'create' } })} style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Create account</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
            <Text style={styles.outlineText}>Sign in</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={doSignOut} disabled={busy} style={({ pressed }) => [styles.btn, styles.outline, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={palette.accent} /> : <Text style={styles.outlineText}>Sign out</Text>}
        </Pressable>
      )}

      <View style={styles.footer}>
        <MaterialCommunityIcons name="anvil" size={18} color={palette.textFaint} />
        <Text style={styles.footerText}>ANVIL · by PeteKovSoftware</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', paddingVertical: spacing.sm },
  card: { backgroundColor: palette.card, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.xl, alignItems: 'center', marginTop: spacing.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  status: { color: palette.text, fontSize: 20, fontWeight: '900' },
  statusSub: { color: palette.textMuted, fontSize: 14, marginTop: 4, fontWeight: '600' },
  trialBar: { width: '80%', height: 6, borderRadius: 3, backgroundColor: palette.surface, marginTop: spacing.md, overflow: 'hidden' },
  trialFill: { height: '100%', borderRadius: 3, backgroundColor: palette.accent },
  hint: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xl, marginBottom: spacing.md },
  btn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  primary: { backgroundColor: palette.accent },
  primaryText: { color: palette.accentDark, fontSize: 16, fontWeight: '900' },
  outline: { borderWidth: 1.5, borderColor: palette.accent },
  outlineText: { color: palette.accent, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  footerText: { color: palette.textFaint, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
});
