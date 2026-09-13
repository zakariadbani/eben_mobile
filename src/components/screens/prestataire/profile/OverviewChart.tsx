import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import Colors from '@/constants/Colors';

export interface OverviewChartPoint {
  label: string;
  value: number;
}

export interface OverviewChartProps {
  points: OverviewChartPoint[];
  /** Mirror the X axis (Arabic: most recent on the left). */
  rtl?: boolean;
  height?: number;
  /** Whole-number Y ticks (counts); money metrics keep fractional "nice" steps. */
  integerTicks?: boolean;
  testID?: string;
}

const Y_AXIS_WIDTH = 40;
const X_AXIS_HEIGHT = 32;
const TOP_PADDING = 12;
const Y_TICKS = 5;
const MAX_X_LABELS = 7;
/** Minimum horizontal room per X label (dp) so bucket labels never collide. */
const X_LABEL_SPACING = 56;

/**
 * "Nice" rounded ticks covering [min, max] (at most Y_TICKS). Integer ticks use
 * whole steps only, so a count series never shows 0.5 / 1.5.
 */
export function ticksFor(min: number, max: number, integer = false): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  const span = max - min || Math.max(1, Math.abs(max));
  const rawStep = integer ? Math.max(1, span / (Y_TICKS - 1)) : span / (Y_TICKS - 1);
  const factors = integer ? [1, 2, 5] : [1, 2, 2.5, 5];
  let magnitude = 10 ** Math.floor(Math.log10(rawStep));
  let factorIndex = factors.findIndex((factor) => factor * magnitude >= rawStep);
  if (factorIndex < 0) {
    magnitude *= 10;
    factorIndex = 0;
  }
  const stepAt = () => Math.max(integer ? 1 : 0, factors[factorIndex]! * magnitude);
  let step = stepAt();
  let start = Math.floor(min / step) * step;
  // Grow the step until Y_TICKS ticks from `start` reach `max`.
  while (start + (Y_TICKS - 1) * step < max) {
    factorIndex += 1;
    if (factorIndex >= factors.length) {
      factorIndex = 0;
      magnitude *= 10;
    }
    step = stepAt();
    start = Math.floor(min / step) * step;
  }
  const count = Math.max(2, Math.min(Y_TICKS, Math.ceil((max - start) / step) + 1));
  return Array.from({ length: count }, (_, index) => Math.round((start + index * step) * 100) / 100);
}

/**
 * Smooth monotone cubic path (Fritsch–Carlson): the curve never overshoots its
 * points, so a non-negative series never dips below the zero baseline.
 */
export function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  const [first] = coords;
  let path = `M ${first!.x} ${first!.y}`;
  if (coords.length === 1) return path;
  const secants = coords.slice(0, -1).map((point, index) => {
    const next = coords[index + 1]!;
    const dx = next.x - point.x;
    return dx === 0 ? 0 : (next.y - point.y) / dx;
  });
  const tangents = coords.map((_, index) => {
    if (index === 0) return secants[0]!;
    if (index === coords.length - 1) return secants[secants.length - 1]!;
    const before = secants[index - 1]!;
    const after = secants[index]!;
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  secants.forEach((secant, index) => {
    if (secant === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const a = tangents[index]! / secant;
    const b = tangents[index + 1]! / secant;
    const magnitude = a * a + b * b;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[index] = scale * a * secant;
      tangents[index + 1] = scale * b * secant;
    }
  });
  for (let index = 0; index < coords.length - 1; index++) {
    const p1 = coords[index]!;
    const p2 = coords[index + 1]!;
    const third = (p2.x - p1.x) / 3;
    const c1y = p1.y + tangents[index]! * third;
    const c2y = p2.y - tangents[index + 1]! * third;
    path += ` C ${p1.x + third} ${c1y}, ${p2.x - third} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

/**
 * Figma "Aperçus" chart: smooth yellow curve with a yellow → transparent area fill,
 * grey Y ticks on the leading side and grey bucket labels along the X axis.
 *
 *   <OverviewChart points={buckets.map((b) => ({ label: b.label, value: b.offersSent }))} rtl={isArabic} />
 */
export default function OverviewChart({ points, rtl = false, height = 280, integerTicks = false, testID = 'overview-chart' }: OverviewChartProps): React.ReactElement {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  const ordered = rtl ? [...points].reverse() : points;
  const values = ordered.map((point) => point.value);
  // Zero stays on the axis for non-negative series (the area fills down to it).
  const ticks = ticksFor(Math.min(0, ...values), values.length ? Math.max(...values, 1) : 1, integerTicks);
  const minTick = ticks[0] ?? 0;
  const maxTick = ticks[ticks.length - 1] ?? 1;
  const range = maxTick - minTick || 1;

  const plotLeft = rtl ? 0 : Y_AXIS_WIDTH;
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH);
  const plotHeight = height - X_AXIS_HEIGHT - TOP_PADDING;
  const stepX = ordered.length > 1 ? plotWidth / (ordered.length - 1) : 0;
  const coords = ordered.map((point, index) => ({
    x: plotLeft + (ordered.length > 1 ? index * stepX : plotWidth / 2),
    y: TOP_PADDING + plotHeight - ((point.value - minTick) / range) * plotHeight,
  }));
  const line = smoothPath(coords);
  const baseline = TOP_PADDING + plotHeight;
  const area = coords.length > 1
    ? `${line} L ${coords[coords.length - 1]!.x} ${baseline} L ${coords[0]!.x} ${baseline} Z`
    : '';
  const maxLabels = Math.max(2, Math.min(MAX_X_LABELS, Math.floor(plotWidth / X_LABEL_SPACING)));
  const labelEvery = Math.max(1, Math.ceil(ordered.length / maxLabels));
  const tickX = rtl ? width - Y_AXIS_WIDTH + 6 : 0;

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout} testID={testID}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="overviewArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.55} />
              <Stop offset="1" stopColor={Colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <G>
            {ticks.map((tick) => {
              const y = TOP_PADDING + plotHeight - ((tick - minTick) / range) * plotHeight;
              return (
                <SvgText key={`y-${tick}`} x={tickX} y={y + 5} fontSize={14} fill={Colors.gray} textAnchor="start">
                  {formatTick(tick)}
                </SvgText>
              );
            })}
            {area ? <Path d={area} fill="url(#overviewArea)" /> : null}
            {line && coords.length > 1 ? <Path d={line} stroke={Colors.primary} strokeWidth={3} fill="none" /> : null}
            {ordered.map((point, index) => (index % labelEvery === 0 ? (
              <SvgText
                key={`x-${point.label}-${index}`}
                x={coords[index]!.x}
                y={height - 8}
                fontSize={13}
                fill={Colors.gray}
                textAnchor={index === 0 ? 'start' : index === ordered.length - 1 ? 'end' : 'middle'}
              >
                {point.label}
              </SvgText>
            ) : null))}
            <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={Colors.greyLight2} strokeWidth={1} />
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
});
