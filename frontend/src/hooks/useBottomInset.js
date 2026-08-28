// useBottomInset — how much space to leave below a screen's last element.
//
// Screens had been guessing: 24, 28, 30, 100, 120, or nothing at all. On an
// iPhone with a home indicator, or an Android phone with gesture navigation,
// the guess is sometimes right and sometimes leaves the last row under the
// system bar.
//
//     const bottom = useBottomInset();
//     ...
//     <View style={{ height: bottom }} />
//
// Pass `extra` when the screen ends in something that wants breathing room —
// a submit button, or a keyboard-adjacent field.

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enough that the last row never sits flush against the system UI, even on a
// device that reports a zero inset.
const MIN_GAP = 24;

export default function useBottomInset(extra = 0) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, MIN_GAP) + extra;
}
