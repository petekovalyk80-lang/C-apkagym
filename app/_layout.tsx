import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { palette, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    border: palette.border,
    primary: palette.accent,
    notification: palette.accent,
  },
};

/** Markowy ekran startowy (widoczny w Expo Go): scena kuźni + wordmark ANVIL. */
function BrandSplash({ label, error }: { label: string; error?: boolean }) {
  return (
    <View style={styles.splash}>
      <Image source={require('../assets/brand/logo.jpg')} style={styles.brandLogo} resizeMode="contain" />
      <View style={styles.splashBottom}>
        {!error && <ActivityIndicator color={palette.accent} />}
        <Text style={[styles.splashLabel, error && { color: palette.danger }]}>{label}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const ready = useStore((s) => s.ready);
  const bootError = useStore((s) => s.error);
  const bootstrap = useStore((s) => s.bootstrap);

  // Minimalny czas ekranu powitalnego — żeby branding był widoczny, a nie migał.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (loaded && ready && minElapsed) {
      SplashScreen.hideAsync();
    }
  }, [loaded, ready, minElapsed]);

  if (!loaded || !ready || !minElapsed) {
    return <BrandSplash label="Firing up the forge…" />;
  }

  if (bootError) {
    return <BrandSplash label={bootError} error />;
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.bg },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="plan-select" options={{ title: 'Change plan', headerBackTitle: 'Back' }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Day details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="workout/[workoutId]" options={{ title: 'Workout' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise', headerBackTitle: 'Back' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#0E0A07', alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: '88%', aspectRatio: 1, maxWidth: 460 },
  splashBottom: { position: 'absolute', bottom: 56, alignItems: 'center', gap: spacing.sm },
  splashLabel: { color: palette.textMuted, fontSize: 13 },
});
