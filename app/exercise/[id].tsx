import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GifImage from '@/components/GifImage';
import { muscleLabel, palette, radius, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const exercise = useStore((s) => s.exerciseById(id));

  if (!exercise) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Exercise not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gifWrap}>
          <GifImage uri={exercise.imageUrl} accent={palette.accent} height={260} rounded={radius.lg} />
        </View>

        <View style={styles.muscleTag}>
          <Text style={styles.muscleText}>{muscleLabel(exercise.muscleGroup)}</Text>
        </View>
        <Text style={styles.title}>{exercise.name}</Text>
        {!!exercise.description && <Text style={styles.desc}>{exercise.description}</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
  muted: { color: palette.textMuted },
  gifWrap: { borderRadius: radius.lg, borderWidth: 2, borderColor: palette.accent, overflow: 'hidden', marginBottom: spacing.lg },
  muscleTag: { alignSelf: 'flex-start', backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5, marginBottom: spacing.sm },
  muscleText: { color: palette.accent, fontWeight: '800', fontSize: 13 },
  title: { color: palette.text, fontSize: 24, fontWeight: '900', lineHeight: 30 },
  desc: { color: palette.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
});
