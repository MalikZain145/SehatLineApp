import { useTheme } from "../context/ThemeContext";
// Shared brand header — the "Sehat Line" wordmark, centered.
//   • "Sehat" is teal (brand primary); "Line" is dark slate.
//   • The logo shows ONLY on the main/home screen (pass `logo`). Every other
//     screen shows just the centered wordmark (+ optional screen name).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BrandLogo from './ui/BrandLogo';
export default function BrandRow({
  subtitle,
  logo = false,
  light = false
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  // On always-light surfaces (admin), keep the original wordmark colors so the
  // dark-slate "Line" never turns near-white on a light background.
  const lineColor = light ? '#1E293B' : COLORS.text;
  const subColor = light ? '#64748B' : COLORS.textLight;
  return <View style={styles.wrap}>
      {logo && <View style={styles.logoCircle}><BrandLogo style={styles.logo} light={light} /></View>}
      <Text style={[styles.brand, logo && styles.brandStacked]}>
        <Text style={styles.accent}>Sehat</Text>
        <Text style={[styles.line, { color: lineColor }]}> Line</Text>
      </Text>
      {!!subtitle && <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>{subtitle}</Text>}
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandStacked: {
    marginTop: 8
  },
  logoCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary + '18',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '55',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8
  },
  brand: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  accent: {
    color: COLORS.primary
  },
  // "Sehat" — teal
  line: {
    color: COLORS.text
  },
  // "Line" — dark slate
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2
  }
});