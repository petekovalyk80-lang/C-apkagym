import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GifImage from '@/components/GifImage';
import { muscleLabel, palette, radius, spacing } from '@/constants/theme';
import type { Exercise } from '@/lib/types';

/** Wiersz listy ćwiczeń (miniatura + nazwa + partia). */
export default function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <GifImage uri={exercise.imageUrl} accent={palette.accent} height={64} rounded={radius.sm} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>
          {exercise.name}
        </Text>
        <Text style={styles.meta}>{muscleLabel(exercise.muscleGroup)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={palette.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  name: { color: palette.text, fontWeight: '700', fontSize: 15, lineHeight: 19 },
  meta: { color: palette.textMuted, fontSize: 13, marginTop: 4 },
});
