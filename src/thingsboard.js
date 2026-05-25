'use strict';

const { telemetrySnapshot } = require('./automation');

function createThingsBoardClient(config = {}) {
  const settings = config.thingsBoard || {};

  function status() {
    if (!settings.host || !settings.accessToken) {
      return {
        connection: 'not_configured',
        lastSyncAt: null,
        lastError: null
      };
    }

    return {
      connection: settings.syncEnabled ? 'configured' : 'disabled',
      lastSyncAt: null,
      lastError: settings.syncEnabled ? null : 'THINGSBOARD_SYNC_ENABLED=false'
    };
  }

  async function postResource(resource, payload) {
    if (!settings.syncEnabled) {
      return { skipped: true, reason: 'ThingsBoard sync is disabled.' };
    }

    const url = `${settings.host}/api/v1/${encodeURIComponent(settings.accessToken)}/${resource}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ThingsBoard ${resource} failed with ${response.status}: ${body.slice(0, 160)}`);
    }

    return { ok: true };
  }

  async function sendTelemetry(state) {
    const payload = telemetrySnapshot(state);
    return postResource('telemetry', payload);
  }

  async function sendAttributes(attributes) {
    return postResource('attributes', attributes);
  }

  return {
    status,
    sendTelemetry,
    sendAttributes
  };
}

module.exports = {
  createThingsBoardClient
};
