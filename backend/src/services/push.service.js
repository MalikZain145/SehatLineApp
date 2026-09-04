// Expo push notifications — delivers alerts while the app is CLOSED.
//
// Local (in-app) notifications only fire when the app is open; to reach a user
// whose app is backgrounded/killed we send through Expo's push service using
// the device's Expo push token (registered from the client after login).
//
// Fire-and-forget: any failure here must never break the action that triggered
// the notification. Invalid/expired tokens are pruned so we stop targeting dead
// devices.
//
// NOTE: expo-server-sdk newer versions are ESM-only, so a top-level
// require('expo-server-sdk') crashes Node with ERR_REQUIRE_ESM (seen on Vercel).
// We therefore load it LAZILY with dynamic import() — which works for both ESM
// and CommonJS builds — and disable push gracefully if it can't be loaded.

const logger = require('../utils/logger');

let _expo = null;   // Expo client instance
let _Expo = null;   // Expo class (for isExpoPushToken)
let _tried = false;

async function getExpo() {
  if (_expo || _tried) return _expo;
  _tried = true;
  try {
    const mod = await import('expo-server-sdk');
    _Expo = mod.Expo || (mod.default && mod.default.Expo) || mod.default;
    if (_Expo) _expo = new _Expo();
  } catch (e) {
    logger.warn(`Push disabled (expo-server-sdk could not load): ${e.message}`);
  }
  return _expo;
}

// Send a push to one or more Expo tokens. Returns the list of tokens that are
// no longer valid (DeviceNotRegistered) so the caller can remove them.
async function sendPush(tokens, { title, body, data = {} } = {}) {
  const expo = await getExpo();
  if (!expo || !_Expo) return { invalidTokens: [] };

  const valid = (Array.isArray(tokens) ? tokens : [tokens]).filter((t) => _Expo.isExpoPushToken(t));
  if (!valid.length) return { invalidTokens: [] };

  const messages = valid.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  const invalidTokens = [];
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      let tickets = [];
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.warn(`Push chunk failed: ${err.message}`);
        continue;
      }
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          invalidTokens.push(chunk[i].to);
        }
      });
    }
  } catch (err) {
    logger.warn(`sendPush error: ${err.message}`);
  }
  return { invalidTokens };
}

module.exports = { sendPush };
