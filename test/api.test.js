'use strict';

const { Readable, Writable } = require('node:stream');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');

function createTestApp() {
  const config = { deviceId: 'test-device' };
  const store = createStore({ deviceId: config.deviceId });
  return createApp({ store, config });
}

function invoke(app, method, url, body) {
  const payload = body ? JSON.stringify(body) : '';
  const request = new Readable({
    read() {
      this.push(payload || null);
      if (payload) {
        this.push(null);
      }
    }
  });
  request.method = method;
  request.url = url;
  request.headers = {
    host: 'localhost',
    'content-type': 'application/json'
  };

  const chunks = [];
  let statusCode = 200;
  let headers = {};
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const response = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    }
  });
  response.writeHead = (code, nextHeaders) => {
    statusCode = code;
    headers = nextHeaders || {};
  };
  response.end = (chunk) => {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    resolveDone({
      status: statusCode,
      headers,
      body: Buffer.concat(chunks).toString('utf8')
    });
  };

  app(request, response);
  return done;
}

test('health endpoint returns service metadata', async () => {
  const response = await invoke(createTestApp(), 'GET', '/api/health');
  const payload = JSON.parse(response.body);

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.deviceId, 'test-device');
});

test('telemetry can trigger automation and queue device command', async () => {
  const app = createTestApp();
  const telemetryResponse = await invoke(app, 'POST', '/api/telemetry', {
    rainDetected: true,
    rainIntensity: 80,
    windowOpenPercent: 60
  });
  const telemetry = JSON.parse(telemetryResponse.body);

  assert.equal(telemetryResponse.status, 202);
  assert.equal(telemetry.decisions.some((decision) => decision.target === 'window' && decision.action === 'close'), true);

  const commandsResponse = await invoke(app, 'GET', '/api/device/commands?deviceId=test-device');
  const commands = JSON.parse(commandsResponse.body);

  assert.equal(commands.commands.length >= 1, true);
  assert.equal(commands.commands[0].target, 'window');
  assert.equal(commands.commands[0].action, 'close');
});
