// ActivityWrapper
// Wrap the app content with this so every touch resets the inactivity
// timer in SessionContext. It does NOT swallow touches (onStartShouldSet
// responderCapture returns false) — it just observes them.

import React from 'react';
import { View } from 'react-native';
import { useSession } from '../../context/SessionContext';

export default function ActivityWrapper({ children, style }) {
  const { resetInactivity } = useSession();

  return (
    <View
      style={[{ flex: 1 }, style]}
      onStartShouldSetResponderCapture={() => {
        resetInactivity();
        return false; // don't intercept — let children handle the touch
      }}
    >
      {children}
    </View>
  );
}
