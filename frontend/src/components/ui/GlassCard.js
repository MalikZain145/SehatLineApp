import { useTheme } from "../../context/ThemeContext";
// GlassCard — a frosted-glass style card.
// Uses expo-blur when available for a real glass effect, with a translucent
// fallback so it always renders. Works on both light and dark backgrounds.

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
let BlurView = null;
try {
  // eslint-disable-next-line global-require
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  BlurView = null;
}
export default function GlassCard({
  children,
  style,
  intensity = 40,
  tint = 'light',
  // 'light' | 'dark'
  radius = 20,
  borderColor
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const border = borderColor || (tint === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)');
  if (BlurView) {
    return <View style={[styles.wrap, {
      borderRadius: radius,
      borderColor: border
    }, style]}>
        <BlurView intensity={intensity} tint={tint} style={[StyleSheet.absoluteFill, {
        borderRadius: radius
      }]} />
        <View style={[styles.tintOverlay, {
        backgroundColor: tint === 'dark' ? 'rgba(26,36,54,0.55)' : 'rgba(255,255,255,0.55)',
        borderRadius: radius
      }]} />
        <View style={styles.content}>{children}</View>
      </View>;
  }

  // Fallback: translucent card.
  return <View style={[styles.wrap, styles.fallback, {
    borderRadius: radius,
    borderColor: border,
    backgroundColor: tint === 'dark' ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.75)'
  }, style]}>
      <View style={styles.content}>{children}</View>
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 8
        },
        shadowOpacity: 0.12,
        shadowRadius: 16
      },
      android: {
        elevation: 4
      }
    })
  },
  fallback: {},
  tintOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  content: {
    padding: 0
  }
});