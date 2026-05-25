'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function json(response, statusCode, data) {
  const body = JSON.stringify(data);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload je prevelik.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Neispravan JSON payload.'));
      }
    });
    request.on('error', reject);
  });
}

function serveStatic(request, response, pathname) {
  const filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    json(response, 403, { error: 'Forbidden' });
    return true;
  }

  if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isFile()) {
    return false;
  }

  const extension = path.extname(normalizedPath);
  response.writeHead(200, {
    'content-type': MIME_TYPES[extension] || 'application/octet-stream'
  });
  fs.createReadStream(normalizedPath).pipe(response);
  return true;
}

function attachThingsBoardSync(store, thingsBoard) {
  if (!thingsBoard) {
    return;
  }

  let updatingSyncStatus = false;
  store.setThingsBoardStatus(thingsBoard.status());
  store.subscribe((state) => {
    if (updatingSyncStatus) {
      return;
    }

    thingsBoard
      .sendTelemetry(state)
      .then((result) => {
        if (result && result.skipped) {
          return;
        }

        updatingSyncStatus = true;
        store.setThingsBoardStatus({
          connection: 'connected',
          lastSyncAt: new Date().toISOString(),
          lastError: null
        });
        updatingSyncStatus = false;
      })
      .catch((error) => {
        updatingSyncStatus = true;
        store.setThingsBoardStatus({
          connection: 'error',
          lastError: error.message
        });
        updatingSyncStatus = false;
      });
  });
}

function createApp({ store, config, thingsBoard }) {
  const streamClients = new Set();
  attachThingsBoardSync(store, thingsBoard);

  store.subscribe((state) => {
    const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
    for (const client of streamClients) {
      client.write(payload);
    }
  });

  return async function app(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type'
      });
      response.end();
      return;
    }

    try {
      if (pathname === '/api/health' && request.method === 'GET') {
        json(response, 200, {
          ok: true,
          service: 'WindowSense API',
          deviceId: config.deviceId,
          time: new Date().toISOString()
        });
        return;
      }

      if (pathname === '/api/state' && request.method === 'GET') {
        json(response, 200, store.getState());
        return;
      }

      if (pathname === '/api/events' && request.method === 'GET') {
        json(response, 200, { events: store.getState().events });
        return;
      }

      if (pathname === '/api/stream' && request.method === 'GET') {
        response.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'access-control-allow-origin': '*'
        });
        response.write(`event: state\ndata: ${JSON.stringify(store.getState())}\n\n`);
        streamClients.add(response);
        request.on('close', () => streamClients.delete(response));
        return;
      }

      if (pathname === '/api/telemetry' && request.method === 'POST') {
        const body = await readJson(request);
        const result = store.ingestTelemetry(body, body.source || 'device');
        json(response, 202, result);
        return;
      }

      if (pathname === '/api/weather' && request.method === 'POST') {
        const body = await readJson(request);
        const result = store.updateWeather(body);
        json(response, 202, result);
        return;
      }

      if (pathname === '/api/automation/thresholds' && request.method === 'POST') {
        const body = await readJson(request);
        const result = store.updateThresholds(body);
        json(response, 202, result);
        return;
      }

      if (pathname === '/api/commands' && request.method === 'POST') {
        const body = await readJson(request);
        const result = store.applyCommand({
          target: body.target,
          action: body.action,
          positionPercent: body.positionPercent,
          source: body.source || 'web'
        });
        json(response, 202, result);
        return;
      }

      if (pathname === '/api/device/commands' && request.method === 'GET') {
        const deviceId = requestUrl.searchParams.get('deviceId') || config.deviceId;
        json(response, 200, { commands: store.pollCommands(deviceId) });
        return;
      }

      if (pathname === '/api/device/ack' && request.method === 'POST') {
        const body = await readJson(request);
        const result = store.acknowledgeCommand(body.commandId, body.status || 'acknowledged');
        if (!result) {
          json(response, 404, { error: 'Komanda nije pronadjena.' });
          return;
        }

        json(response, 202, result);
        return;
      }

      if (serveStatic(request, response, pathname)) {
        return;
      }

      json(response, 404, { error: 'Not found' });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
  };
}

module.exports = {
  createApp,
  readJson
};
