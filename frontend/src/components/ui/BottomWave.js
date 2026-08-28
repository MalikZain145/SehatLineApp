// BottomWave — the flowing mint ribbon that anchors the bottom of the auth
// screens.
//
// Two things make this read as a ribbon rather than a filled rectangle:
//
//   1. A pronounced S-curve. The control points swing well past the anchors,
//      so the crest genuinely arcs instead of sloping gently.
//   2. Banded fills. Each ribbon is the strip *between* two curves, not a
//      solid block running down to the screen edge. Only the last layer is
//      grounded, so the page still ends on a soft mint base.
//
// Drawn with SVG so the curves stay smooth at any width. If react-native-svg
// is missing we fall back to a plain mint base rather than crashing.

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../theme';

let Svg = null;
let Path = null;
try {
  // eslint-disable-next-line global-require
  const svg = require('react-native-svg');
  Svg = svg.Svg || svg.default;
  Path = svg.Path;
} catch (e) {
  Svg = null;
}

const { width: W } = Dimensions.get('window');
const HEIGHT = 200;

// A single sweeping S-curve across the full width.
//
//   lift   — y at the left edge (fraction of height; smaller = higher)
//   drop   — y at the right edge
//   swing  — how hard the curve bows. >1 overshoots the anchors, which is
//            what gives the ribbon its snap.
//
// Control points are clamped to stay on-canvas: an off-canvas control point
// gets clipped by the viewBox, which flattens the very curve we're after.
//
// Returned as an open path ("M … C … C …") so callers can either stroke it or
// close it into a band.
function controls(h, { lift, drop, swing = 1 }) {
  const yL = h * lift;
  const yR = h * drop;
  const span = yL - yR;
  const pad = 2;

  return {
    yL,
    yR,
    // Bows below the left anchor, then above the right one.
    c1y: clamp(yL + span * 0.55 * swing, pad, h - pad),
    c2y: clamp(yR - span * 0.45 * swing, pad, h - pad),
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function curve(h, spec) {
  const { yL, yR, c1y, c2y } = controls(h, spec);
  return `M0,${yL} C ${W * 0.30},${c1y} ${W * 0.62},${c2y} ${W},${yR}`;
}

// Close a curve down to the bottom edge → a grounded fill.
function grounded(h, spec) {
  return `${curve(h, spec)} L${W},${h} L0,${h} Z`;
}

// Close the strip between two curves → a floating band (the ribbon itself).
// The lower edge is traced right-to-left so the outline never self-crosses.
function band(h, top, bottom) {
  const upper = curve(h, top);
  const { yL, yR, c1y, c2y } = controls(h, bottom);

  // …upper curve left→right, then the lower curve right→left, then close.
  return `${upper} L${W},${yR} C ${W * 0.62},${c2y} ${W * 0.30},${c1y} 0,${yL} Z`;
}

export default function BottomWave({ height = HEIGHT, style }) {
  if (!Svg || !Path) {
    return <View style={[styles.fallback, { height: height * 0.4 }, style]} pointerEvents="none" />;
  }

  // Ribbons fall to the right; the base rises to meet them. That opposition
  // is what makes the composition feel like tape crossing over itself.
  const ribbon2Top    = { lift: 0.34, drop: 0.12, swing: 1.5 };
  const ribbon2Bottom = { lift: 0.44, drop: 0.22, swing: 1.5 };

  const ribbonTop    = { lift: 0.52, drop: 0.28, swing: 1.45 };
  const ribbonBottom = { lift: 0.66, drop: 0.42, swing: 1.45 };

  const baseSoft  = { lift: 0.72, drop: 0.46, swing: 1.4 };
  const baseSolid = { lift: 0.86, drop: 0.60, swing: 1.35 };

  return (
    <View style={[styles.wrap, { height }, style]} pointerEvents="none">
      <Svg width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
        {/* Thin ribbon, highest and faintest */}
        <Path d={band(height, ribbon2Top, ribbon2Bottom)} fill={COLORS.mint} opacity={0.35} />

        {/* Main ribbon */}
        <Path d={band(height, ribbonTop, ribbonBottom)} fill={COLORS.mint} opacity={0.6} />

        {/* Soft base wash */}
        <Path d={grounded(height, baseSoft)} fill={COLORS.mint} opacity={0.4} />

        {/* Solid base the page rests on */}
        <Path d={grounded(height, baseSolid)} fill={COLORS.mint} opacity={0.95} />

        {/* Hairline along the base crest */}
        <Path d={curve(height, baseSolid)} stroke={COLORS.tealLight} strokeWidth={1.1} fill="none" opacity={0.4} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fallback: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.mint,
    opacity: 0.75,
  },
});
