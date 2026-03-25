module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? "dev-mobile-key",
  },
});
