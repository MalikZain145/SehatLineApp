// Reload the whole app (a real front-end "restart"). Works in dev (Metro) via
// DevSettings.reload(), and in a production build via expo-updates
// reloadAsync(). Returns true if a reload was triggered.

export async function reloadApp() {
  // Dev / Expo Go: reload the JS bundle like pressing "r" in Metro.
  try {
    // eslint-disable-next-line global-require
    const { DevSettings } = require('react-native');
    if (typeof __DEV__ !== 'undefined' && __DEV__ && DevSettings && DevSettings.reload) {
      DevSettings.reload();
      return true;
    }
  } catch (e) { /* fall through */ }

  // Production build with EAS Updates: reload the bundle.
  try {
    // eslint-disable-next-line global-require
    const Updates = require('expo-updates');
    if (Updates && Updates.reloadAsync) {
      await Updates.reloadAsync();
      return true;
    }
  } catch (e) { /* fall through */ }

  return false;
}

// On app launch in a PRODUCTION build: if a new version was deployed (EAS
// Update), fetch it and reload so the app auto-"restarts" onto the new code —
// no manual step. No-op in dev / Expo Go.
export async function applyDeployedUpdate() {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) return false;
    // eslint-disable-next-line global-require
    const Updates = require('expo-updates');
    if (!Updates || !Updates.checkForUpdateAsync) return false;
    const res = await Updates.checkForUpdateAsync();
    if (res && res.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
  } catch (e) { /* offline / not configured — ignore */ }
  return false;
}

export default reloadApp;
