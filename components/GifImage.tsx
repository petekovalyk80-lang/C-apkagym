import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette, radius } from '@/constants/theme';

interface Props {
  uri: string;
  /** Kolor akcentu (np. koloru partii) dla spinnera i tła. */
  accent?: string;
  /** Zaokrąglenie rogów. */
  rounded?: number;
  /** Wysokość kontenera. */
  height?: number;
}

/**
 * Wyświetla animowany GIF ćwiczenia (expo-image odtwarza GIF-y natywnie).
 * Pokazuje spinner do czasu załadowania i placeholder przy błędzie sieci.
 */
export default function GifImage({ uri, accent = palette.accent, rounded = radius.md, height }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.wrap, { borderRadius: rounded, height }]}>
      {!error && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={200}
          cachePolicy="disk"
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {loading && !error && (
        <ActivityIndicator color={accent} style={StyleSheet.absoluteFill} />
      )}
      {error && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, opacity: 0.6 },
});
