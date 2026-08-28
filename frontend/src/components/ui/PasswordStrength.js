// PasswordStrength — a live strength meter for password inputs.
// Shows a colored bar + label (Weak / Fair / Good / Strong) based on length,
// case, digits, and symbols.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function scorePassword(pw = '') {
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4); // 0..4
}

const LEVELS = [
  { label: '', color: '#E2E8F0' },
  { label: 'Weak', color: '#EF4444' },
  { label: 'Fair', color: '#F59E0B' },
  { label: 'Good', color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

export default function PasswordStrength({ password = '' }) {
  const score = scorePassword(password);
  const level = LEVELS[score];
  if (!password) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= score ? level.color : '#E2E8F0' }]} />
        ))}
      </View>
      <Text style={[styles.label, { color: level.color }]}>{level.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '700', width: 52, textAlign: 'right' },
});
