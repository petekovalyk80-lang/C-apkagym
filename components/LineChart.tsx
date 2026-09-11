import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { palette, spacing } from '@/constants/theme';

interface Props {
  /** Wartości Y w kolejności chronologicznej. */
  values: number[];
  /** Etykiety X (daty) — pokazujemy pierwszą i ostatnią. */
  labels?: string[];
  height?: number;
  color?: string;
  /** Jednostka do etykiet min/max (np. "kg", "reps", "s"). */
  unit?: string;
}

const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 4;

/**
 * Lekki wykres liniowy na react-native-svg (Expo Go OK). Skala Y wg min/max
 * z headroomem, punkty rozłożone równomiernie wg indeksu. Ostatni punkt wyróżniony.
 */
export default function LineChart({ values, labels, height = 200, color = palette.accent, unit = '' }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  // 8% headroomu góra/dół, żeby linia nie kleiła się do krawędzi
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;

  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = height - PAD_T - PAD_B;
  const x = (i: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (plotW * i) / (n - 1));
  const y = (v: number) => PAD_T + plotH * (1 - (v - lo) / (hi - lo || 1));

  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  // obszar pod linią (delikatne wypełnienie)
  const area =
    n >= 1 && width > 0
      ? `M ${x(0)},${y(values[0])} ` +
        values.map((v, i) => `L ${x(i)},${y(v)}`).join(' ') +
        ` L ${x(n - 1)},${PAD_T + plotH} L ${x(0)},${PAD_T + plotH} Z`
      : '';

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && n > 0 && (
        <>
          <Svg width={width} height={height}>
            {/* linie siatki: góra/dół */}
            <Line x1={PAD_L} y1={y(max)} x2={width - PAD_R} y2={y(max)} stroke={palette.border} strokeWidth={1} />
            <Line x1={PAD_L} y1={y(min)} x2={width - PAD_R} y2={y(min)} stroke={palette.border} strokeWidth={1} />
            {area ? <Path d={area} fill={color} opacity={0.1} /> : null}
            {n > 1 && <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {values.map((v, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={i === n - 1 ? 5 : 3}
                fill={i === n - 1 ? color : palette.bg}
                stroke={color}
                strokeWidth={2}
              />
            ))}
          </Svg>
          {/* Etykiety min/max Y */}
          <Text style={[styles.yLabel, { top: y(max) - 8 }]}>{fmt(max)}{unit ? ` ${unit}` : ''}</Text>
          {max !== min && <Text style={[styles.yLabel, { top: y(min) - 8 }]}>{fmt(min)}{unit ? ` ${unit}` : ''}</Text>}
        </>
      )}
      {/* Etykiety dat: pierwsza i ostatnia */}
      {labels && labels.length > 0 && (
        <View style={styles.xRow}>
          <Text style={styles.xLabel}>{labels[0]}</Text>
          {labels.length > 1 && <Text style={styles.xLabel}>{labels[labels.length - 1]}</Text>}
        </View>
      )}
    </View>
  );
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const styles = StyleSheet.create({
  yLabel: { position: 'absolute', right: PAD_R, color: palette.textFaint, fontSize: 10, fontWeight: '700' },
  xRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  xLabel: { color: palette.textFaint, fontSize: 11, fontWeight: '600' },
});
