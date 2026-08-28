// Expo push notifications — delivers alerts while the app is CLOSED.
//
// Local (in-app) notifications only fire when the app is open; to reach a user
// whose app is backgrounded/killed we send through Expo's push service using
// the device's Expo push token (registered from the client after login).
//
// Fire-and-forget: any failure here must never break the action that triggered
// the notification. Invalid/expired tokens are pruned so we stop targeting dead
// devices.

const { Expo } = require('expo-server-sdk');
const logger = require('../utils/logger');

const expo = new Expo();

// Send a push to one or more Expo tokens. Returns the list of tokens that are
// no longer valid (DeviceNotRegistered) so the caller can remove them.
async function sendPush(tokens, { title, body, data = {} }) {
  const valid = (Array.isArray(tokens) ? tokens : [tokens]).filter((t) => Expo.isExpoPushToken(t));
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
        if (ticket.status === 'error') {
          // A DeviceNotRegistered error means the token is dead — prune it.
          if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            invalidTokens.push(chunk[i].to);
          }
        }
      });
    }
  } catch (err) {
    logger.warn(`sendPush error: ${err.message}`);
  }
  return { invalidTokens };
}

module.exports = { sendPush, Expo };
