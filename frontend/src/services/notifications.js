// Local notifications helper — shows "Now Serving" style alerts.
// IMPORTANT: only LOCAL notifications are used (scheduleNotificationAsync).
// Remote push was removed from Expo Go in SDK 53, but local notifications
// still work. We guard everything so nothing throws in Expo Go.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

let configured = false;

// User's "Notifications" preference. When off, notify() delivers nothing.
// Cached in memory (so the hot path is synchronous) and mirrored to storage so
// the choice survives restarts. Default ON.
const NOTIF_PREF_KEY = 'notifications_enabled';
let notifEnabled = true;

export async function loadNotificationPref() {
  try {
    const v = await AsyncStorage.getItem(NOTIF_PREF_KEY);
    notifEnabled = v === null ? true : v === '1';
  } catch (e) {
    notifEnabled = true;
  }
  return notifEnabled;
}

export async function setNotificationsEnabled(on) {
  notifEnabled = !!on;
  try { await AsyncStorage.setItem(NOTIF_PREF_KEY, notifEnabled ? '1' : '0'); } catch (e) {}
  // Turning off also clears any queued/pending local notifications.
  if (!notifEnabled && Notifications) {
    try { await Notifications.dismissAllNotificationsAsync(); } catch (e) {}
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
  }
  return notifEnabled;
}

export function areNotificationsEnabled() {
  return notifEnabled;
}

export async function setupNotifications() {
  await loadNotificationPref();
  if (configured || !Notifications) return;
  configured = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('queue', {
        name: 'Token & Queue Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0BAA9D',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        bypassDnd: false,
        showBadge: true,
      });
      // Dedicated channel for user-set medicine reminders.
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0BAA9D',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      // Channel for remote push (used when the app is closed).
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SehatLine Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0BAA9D',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Local notifications only need this permission; wrap so it never throws.
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) {
      await Notifications.requestPermissionsAsync();
    }
  } catch (e) {
    // Expo Go may warn about push — safe to ignore for local notifications.
  }
}

// Fire a LOCAL notification immediately (works in Expo Go for local; full
// heads-up banner behaviour like WhatsApp needs a development build / APK).
export async function notify(title, body) {
  if (!Notifications || !notifEnabled) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        vibrate: [0, 250, 250, 250],
        ...(Platform.OS === 'android' ? { channelId: 'queue' } : {}),
      },
      trigger: null, // deliver now
    });
  } catch (e) {
    // ignore — the in-app banner is the fallback
  }
}

// Schedule a LOCAL daily repeating reminder at hour:minute (24h). Returns the
// scheduled notification id — persist it so the reminder can be cancelled
// later — or null if notifications aren't available. Fires every day even when
// the app is closed (local scheduled notification, no push server needed).
export async function scheduleDailyReminder({ title, body, hour, minute }) {
  if (!Notifications) return null;
  try {
    // Make sure permission has been requested before scheduling.
    await setupNotifications();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 'high',
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: { hour, minute, repeats: true },
    });
    return id;
  } catch (e) {
    return null;
  }
}

// Cancel a previously scheduled reminder by its id.
export async function cancelReminder(id) {
  if (!Notifications || !id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch (e) {}
}

// Obtain this device's Expo push token so the backend can deliver
// notifications while the app is CLOSED. Returns null when it can't (Expo Go,
// no permission, or no EAS projectId configured) — the caller then simply
// relies on in-app/local notifications.
export async function getExpoPushToken() {
  if (!Notifications) return null;
  try {
    await setupNotifications();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) return null;
      perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) return null;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      null;
    if (!projectId) {
      // Without an EAS projectId (or in Expo Go) a push token can't be issued.
      return null;
    }
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res?.data || null;
  } catch (e) {
    return null;
  }
}

// Register a handler for when the user TAPS a notification (foreground or from
// closed). Returns an unsubscribe fn. `data.screen`/`data.refId` are used to
// deep-link into the right screen.
export function addNotificationResponseListener(handler) {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      handler(data);
    });
    return () => { try { sub.remove(); } catch (e) {} };
  } catch (e) {
    return () => {};
  }
}

export default {
  setupNotifications, notify, scheduleDailyReminder, cancelReminder,
  getExpoPushToken, addNotificationResponseListener,
  loadNotificationPref, setNotificationsEnabled, areNotificationsEnabled,
};
