'use strict';

const http = require('node:http');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { createStore } = require('./store');
const { createThingsBoardClient } = require('./thingsboard');

const config = loadConfig();
const store = createStore({ deviceId: config.deviceId });
const thingsBoard = createThingsBoardClient(config);
const server = http.createServer(createApp({ store, config, thingsBoard }));

server.listen(config.port, () => {
  console.log(`WindowSense web app: http://localhost:${config.port}`);
  console.log(`ESP32 command polling: http://localhost:${config.port}/api/device/commands?deviceId=${config.deviceId}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
