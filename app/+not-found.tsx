import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This page does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to plan</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: palette.bg,
  },
  title: { fontSize: 20, fontWeight: '800', color: palette.text },
  link: { marginTop: spacing.lg, paddingVertical: spacing.md },
  linkText: { color: palette.accent, fontWeight: '700' },
});
