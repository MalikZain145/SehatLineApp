// FadeInView — AOS-style entrance animation.
// Fades + slides content in on mount (with optional delay), so screens feel
// alive as sections appear. Use `delay` to stagger multiple items.

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export default function FadeInView({
  children,
  delay = 0,
  duration = 500,
  offset = 24,          // how far it slides up
  direction = 'up',     // 'up' | 'down' | 'left' | 'right'
  style,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration, delay, useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0, duration, delay, useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, translate, delay, duration]);

  const transform = [];
  if (direction === 'up' || direction === 'down') {
    transform.push({ translateY: direction === 'up' ? translate : Animated.multiply(translate, -1) });
  } else {
    transform.push({ translateX: direction === 'left' ? translate : Animated.multiply(translate, -1) });
  }

  return (
    // `needsOffscreenAlphaCompositing` is required on Android: without it, fading
    // the opacity of a view that contains an elevated child (a card with
    // `elevation`) renders the shadow as a hard BLACK RECTANGLE during the
    // animation. Compositing offscreen makes the shadow fade smoothly with the
    // card, so no black border/box flashes on the login/signup/forgot screens.
    <Animated.View needsOffscreenAlphaCompositing style={[style, { opacity, transform }]}>
      {children}
    </Animated.View>
  );
}
