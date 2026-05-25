'use strict';

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parsePort(value) {
  const port = Number(value || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 3000;
  }

  return port;
}

function loadConfig(env = process.env) {
  const host = env.THINGSBOARD_HOST ? String(env.THINGSBOARD_HOST).replace(/\/+$/, '') : '';
  const accessToken = env.THINGSBOARD_ACCESS_TOKEN || '';
  const syncEnabled = parseBoolean(env.THINGSBOARD_SYNC_ENABLED, false);

  return {
    port: parsePort(env.PORT),
    thingsBoard: {
      host,
      accessToken,
      syncEnabled: Boolean(syncEnabled && host && accessToken)
    },
    deviceId: env.WINDOWSENSE_DEVICE_ID || 'windowsense-esp32-01'
  };
}

module.exports = {
  loadConfig,
  parseBoolean,
  parsePort
};
