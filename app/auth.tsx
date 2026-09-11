import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { sendReset } from '@/lib/firebase';
import { useStore } from '@/store/useStore';

/** Firebase → komunikat po ludzku. */
function friendlyError(code: string): string {
  if (code.includes('email-already-in-use')) return 'That email already has an account. Try signing in.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  if (code.includes('weak-password')) return 'Password is too weak — use at least 8 characters.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Wrong email or password.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again in a moment.';
  if (code.includes('network')) return 'Network error — check your connection.';
  if (code.includes('operation-not-allowed')) return 'Email sign-in is not enabled yet. Enable Email/Password in the Firebase console.';
  return 'Something went wrong. Please try again.';
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isCreate = mode !== 'signin';

  const createAccount = useStore((s) => s.createAccount);
  const signIn = useStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setError(null);
    setNotice(null);
    const mail = email.trim();
    if (!mail || !mail.includes('@')) return setError('Enter a valid email.');
    if (isCreate && password.length < 8) return setError('Password must be at least 8 characters.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    try {
      if (isCreate) await createAccount(mail, password);
      else await signIn(mail, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(friendlyError(String(e?.code ?? e?.message ?? '')));
      setBusy(false);
    }
  }

  async function forgot() {
    setError(null);
    setNotice(null);
    const mail = email.trim();
    if (!mail || !mail.includes('@')) return setError('Enter your email above first, then tap reset.');
    try {
      await sendReset(mail);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (e: any) {
      setError(friendlyError(String(e?.code ?? '')));
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: isCreate ? 'Create account' : 'Welcome back', headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.h1}>{isCreate ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.sub}>
            {isCreate
              ? 'Keep your training history and pick up on any device.'
              : 'Sign in and your whole history loads back.'}
          </Text>

          {/* Google — Etap 2 (wymaga builda aplikacji) */}
          <View style={styles.googleWrap}>
            <View style={[styles.btn, styles.google, styles.googleDisabled]}>
              <MaterialCommunityIcons name="google" size={18} color={palette.textFaint} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </View>
            <Text style={styles.soon}>Google sign-in arrives with the installable app build.</Text>
          </View>

          <View style={styles.divide}><View style={styles.line} /><Text style={styles.or}>or</Text><View style={styles.line} /></View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={palette.textFaint}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
          <View style={styles.pwRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoCapitalize="none"
              placeholder={isCreate ? 'At least 8 characters' : 'Your password'}
              placeholderTextColor={palette.textFaint}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} style={styles.eye}>
              <MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.textMuted} />
            </Pressable>
          </View>

          {!isCreate && (
            <Pressable onPress={forgot} hitSlop={8} style={styles.forgot}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed, busy && styles.pressed]}>
            {busy ? <ActivityIndicator color={palette.accentDark} /> : <Text style={styles.primaryText}>{isCreate ? 'Create account' : 'Sign in'}</Text>}
          </Pressable>

          {isCreate && <Text style={styles.fine}>By continuing you agree to the Terms & Privacy Policy.</Text>}

          <Pressable onPress={() => router.replace({ pathname: '/auth', params: { mode: isCreate ? 'signin' : 'create' } })} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {isCreate ? 'Already have an account? ' : 'New to Anvil? '}
              <Text style={styles.toggleStrong}>{isCreate ? 'Sign in' : 'Create account'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  h1: { color: palette.text, fontSize: 24, fontWeight: '900' },
  sub: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: spacing.lg },
  googleWrap: { gap: 6 },
  btn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  google: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  googleDisabled: { opacity: 0.6 },
  googleText: { color: palette.textMuted, fontSize: 15, fontWeight: '700' },
  soon: { color: palette.textFaint, fontSize: 11.5, textAlign: 'center' },
  divide: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: palette.border },
  or: { color: palette.textFaint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  label: { color: palette.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, color: palette.text, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: 13, marginBottom: 2 },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eye: { padding: 6 },
  forgot: { alignSelf: 'flex-end', marginTop: spacing.sm },
  link: { color: palette.accent, fontSize: 13, fontWeight: '600' },
  error: { color: palette.danger, fontSize: 13.5, fontWeight: '600', marginTop: spacing.md },
  notice: { color: palette.accent, fontSize: 13.5, fontWeight: '600', marginTop: spacing.md },
  primary: { backgroundColor: palette.accent, marginTop: spacing.lg },
  primaryText: { color: palette.accentDark, fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.85 },
  fine: { color: palette.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
  toggle: { alignItems: 'center', marginTop: spacing.xl },
  toggleText: { color: palette.textMuted, fontSize: 14 },
  toggleStrong: { color: palette.accent, fontWeight: '800' },
});
