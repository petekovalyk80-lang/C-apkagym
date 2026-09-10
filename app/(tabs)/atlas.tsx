import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExerciseRow from '@/components/ExerciseRow';
import { muscleLabel, palette, radius, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

export default function AtlasScreen() {
  const insets = useSafeAreaInsets();
  const exercisesMap = useStore((s) => s.exercises);
  const all = useMemo(
    () => Object.values(exercisesMap).sort((a, b) => a.name.localeCompare(b.name)),
    [exercisesMap],
  );

  const groups = useMemo(() => {
    const set = new Set(all.map((e) => e.muscleGroup));
    return ['all', ...Array.from(set)];
  }, [all]);

  const [filter, setFilter] = useState<string>('all');
  const data = useMemo(
    () => (filter === 'all' ? all : all.filter((e) => e.muscleGroup === filter)),
    [all, filter],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Exercise Atlas</Text>
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          data={groups}
          keyExtractor={(g) => g}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const active = filter === item;
            return (
              <Pressable
                onPress={() => setFilter(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item === 'all' ? 'All' : muscleLabel(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ExerciseRow exercise={item} />}
        ListHeaderComponent={<Text style={styles.count}>{data.length} exercises</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  chipsWrap: { borderBottomWidth: 1, borderBottomColor: palette.border },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5, borderColor: palette.border, marginRight: spacing.sm },
  chipActive: { borderColor: palette.accent, backgroundColor: palette.accentDim },
  chipText: { fontWeight: '700', fontSize: 13, color: palette.textMuted },
  chipTextActive: { color: palette.accent },
  list: { padding: spacing.lg },
  count: { color: palette.textFaint, fontSize: 12, marginBottom: spacing.md },
});
