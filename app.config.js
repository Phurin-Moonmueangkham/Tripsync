const appJson = require('./app.json');

module.exports = ({ config = {} }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  return {
    ...appJson.expo,
    ...config,
    android: {
      ...appJson.expo.android,
      ...config.android,
      config: {
        ...(appJson.expo.android?.config ?? {}),
        ...(config.android?.config ?? {}),
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
  };
};