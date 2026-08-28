// ============================================================
// AnimatedSplash
// Shows the SehatLine logo filling with its colors from BOTTOM to TOP
// (slowly). When the fill completes, it calls onFinish() so the app can
// move to the Welcome screen.
//
// How the fill works:
//   • A gray silhouette of the logo sits in the back (the "empty" state).
//   • The full-color logo sits on top, but is clipped by an animated height
//     that grows from the bottom up — revealing color from bottom to top.
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme';

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width * 0.55, 240);

// How long the fill takes (ms). Higher = slower fill.
const FILL_DURATION = 2200;
// Small pause after fill completes before leaving.
const HOLD_AFTER_FILL = 500;

export default function AnimatedSplash({ onFinish }) {
  // 0 = empty (no color), 1 = fully filled
  const fill = useRef(new Animated.Value(0)).current;
  // whole-screen fade out at the very end
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // fill bottom → top
      Animated.timing(fill, {
        toValue: 1,
        duration: FILL_DURATION,
        useNativeDriver: false, // we animate height, so native driver off
      }),
      // hold briefly
      Animated.delay(HOLD_AFTER_FILL),
    ]).start(() => {
      // fade the splash out, then tell the app to continue
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onFinish && onFinish();
      });
    });
  }, []);

  // The colored logo is revealed by a container whose height grows 0 → LOGO_SIZE.
  // We anchor it to the bottom so the reveal moves upward.
  const revealHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOGO_SIZE],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Same gradient as the Welcome screen for a seamless transition */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.background, COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.logoWrap}>
          {/* Back layer: gray silhouette (empty state) */}
          <Image
            source={require('../../assets/logo-empty.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Front layer: full-color logo, clipped from the bottom up */}
          <Animated.View style={[styles.revealMask, { height: revealHeight }]}>
            {/* Inner image is pinned to the bottom of the mask so it lines up
                exactly with the silhouette regardless of mask height. */}
            <Image
              source={require('../../assets/logo-transparent.png')}
              style={[styles.logo, styles.revealImage]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  // Mask sits at the bottom of the logo area and grows upward.
  revealMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: LOGO_SIZE,
    overflow: 'hidden',
  },
  // Pin the color image to the bottom of the mask so it stays aligned.
  revealImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
