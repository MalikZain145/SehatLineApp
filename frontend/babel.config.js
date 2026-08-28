// Babel config for Expo SDK 54.
// NOTE: reanimated v4 uses 'react-native-worklets/plugin' (not the old
// 'react-native-reanimated/plugin'). It MUST be listed last.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
