// AuthLogo — the SehatLine brand mark used at the top of every auth screen
// (Login, Signup, Forgot Password) so they all look identical.
//
// Renders: glowing backlight → circular logo → "SEHAT" (white) + "LINE" (navy)
// → "CDA Healthcare Portal" tagline.
//
// Pass `compact` on screens that need a tighter header (e.g. multi-step forms).

import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function AuthLogo({ compact = false, subtitle = 'CDA Healthcare Portal' }) {
  return (
    <View style={[styles.logoSection, compact && styles.logoSectionCompact]}>
      <View style={[styles.logoCircle, compact && styles.logoCircleCompact]}>
        <Image source={require('../../assets/logo.png')} style={[styles.logoImage, compact && styles.logoImageCompact]} />
      </View>

      <Text style={[styles.appName, compact && styles.appNameCompact]}>
        SEHAT<Text style={styles.appNameAccent}>LINE</Text>
      </Text>
      <Text style={styles.tagline}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoSection: {
    alignItems: 'center',
    marginBottom: height * 0.035,
  },
  logoSectionCompact: { marginBottom: height * 0.012 },


  // A clean ring, nothing behind it — the reference has no glow.
  logoCircle: {
    width: width * 0.20,
    height: width * 0.20,
    borderRadius: width * 0.10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  logoCircleCompact: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: width * 0.075,
    marginBottom: 6,
  },

  // The asset has no built-in padding, so these dimensions are the mark's
  // drawn size. 52% of the ring's diameter keeps it clear of the border.
  logoImage: {
    width: width * 0.104,
    height: width * 0.104,
    resizeMode: 'contain',
  },
  logoImageCompact: {
    width: width * 0.078,
    height: width * 0.078,
  },

  appName: {
    fontSize: width * 0.085,
    fontWeight: '900',
    color: COLORS.primary,   // "SEHAT" — teal
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  appNameCompact: { fontSize: width * 0.062 },
  appNameAccent: { color: COLORS.text },   // "LINE" — dark slate

  tagline: {
    fontSize: width * 0.030,
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
});
