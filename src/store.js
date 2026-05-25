'use strict';

const { clamp, createDefaultState, evaluateAutomation } = require('./automation');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === 'false' || value === '0' || value === 0) {
    return false;
  }

  return fallback;
}

function normalizeNumber(value, fallback, min, max) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return clamp(value, min, max);
}

function buildCommand({ deviceId, target, action, positionPercent, source }) {
  return {
    id: makeId('cmd'),
    ts: new Date().toISOString(),
    deviceId,
    target,
    action,
    positionPercent,
    source,
    status: 'pending',
    acknowledgedAt: null
  };
}

function createStore(options = {}) {
  const deviceId = options.deviceId || 'windowsense-esp32-01';
  let state = options.initialState ? clone(options.initialState) : createDefaultState(deviceId);
  const listeners = new Set();

  function notify() {
    const snapshot = clone(state);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function addEvent(level, source, title, details) {
    state.events.unshift({
      id: makeId('evt'),
      ts: new Date().toISOString(),
      level,
      source,
      title,
      details
    });

    state.events = state.events.slice(0, 80);
  }

  function queueCommand(command) {
    const queued = buildCommand({
      deviceId: command.deviceId || deviceId,
      target: command.target,
      action: command.action,
      positionPercent: command.positionPercent,
      source: command.source || 'api'
    });

    state.commandQueue.unshift(queued);
    state.commandQueue = state.commandQueue.slice(0, 40);
    return queued;
  }

  function setActuatorState(target, action, positionPercent) {
    const now = new Date().toISOString();

    if (target === 'window') {
      const current = state.actuators.window.openPercent;
      const nextPosition =
        action === 'open' ? 100 : action === 'close' ? 0 : normalizeNumber(positionPercent, current, 0, 100);
      state.actuators.window.openPercent = nextPosition;
      state.actuators.window.status = 'idle';
      state.actuators.window.lastCommandAt = now;
      state.sensors.windowContactOpen = nextPosition > 0;
      return nextPosition;
    }

    if (target === 'blinds') {
      const current = state.actuators.blinds.positionPercent;
      const nextPosition =
        action === 'open' ? 0 : action === 'close' ? 100 : normalizeNumber(positionPercent, current, 0, 100);
      state.actuators.blinds.positionPercent = nextPosition;
      state.actuators.blinds.status = 'idle';
      state.actuators.blinds.lastCommandAt = now;
      return nextPosition;
    }

    return null;
  }

  function applyCommand(command, options = {}) {
    const target = command.target;
    const action = command.action;
    const allowedTargets = ['window', 'blinds', 'automation'];
    const allowedActions = ['open', 'close', 'stop', 'setPosition', 'auto', 'manual'];

    if (!allowedTargets.includes(target)) {
      throw new Error('Nepoznat cilj komande.');
    }

    if (!allowedActions.includes(action)) {
      throw new Error('Nepoznata akcija komande.');
    }

    if (target === 'automation') {
      if (action !== 'auto' && action !== 'manual') {
        throw new Error('Automatizacija podrzava samo auto ili manual mod.');
      }

      state.automation.mode = action;
      addEvent('info', command.source || 'api', `Automatizacija: ${action}`, `Nacin rada promijenjen je u ${action}.`);
      state.updatedAt = new Date().toISOString();
      notify();
      return { mode: state.automation.mode };
    }

    if (action === 'stop') {
      state.actuators[target].status = 'idle';
      addEvent('warning', command.source || 'api', `Zaustavljen ${target}`, 'Aktuator je zaustavljen rucnom komandom.');
      state.updatedAt = new Date().toISOString();
      notify();
      return { target, action };
    }

    const position = setActuatorState(target, action, command.positionPercent);
    const queued = options.queue !== false ? queueCommand({ ...command, target, action, positionPercent: position }) : null;
    const label = target === 'window' ? 'Prozor' : 'Rolete';
    addEvent(
      command.source === 'automation' ? 'success' : 'info',
      command.source || 'api',
      `${label}: ${action}`,
      position === null ? 'Komanda je zaprimljena.' : `Ciljana pozicija je ${Math.round(position)}%.`
    );

    state.updatedAt = new Date().toISOString();
    notify();
    return { target, action, positionPercent: position, queued };
  }

  function runAutomation() {
    const decisions = evaluateAutomation(state);
    for (const decision of decisions) {
      applyCommand({ ...decision, source: 'automation' }, { queue: true });
      state.automation.lastDecisionAt = new Date().toISOString();
      addEvent('success', 'automation', 'Automatska odluka', decision.reason);
    }

    return decisions;
  }

  function ingestTelemetry(payload = {}, source = 'device') {
    const sensors = state.sensors;
    const weather = state.weather;

    sensors.rainDetected = normalizeBoolean(payload.rainDetected, sensors.rainDetected);
    sensors.rainIntensity = normalizeNumber(payload.rainIntensity, sensors.rainIntensity, 0, 100);
    sensors.lightLux = normalizeNumber(payload.lightLux, sensors.lightLux, 0, 120000);
    sensors.windowContactOpen = normalizeBoolean(payload.windowContactOpen, sensors.windowContactOpen);
    sensors.indoorTempC = normalizeNumber(payload.indoorTempC, sensors.indoorTempC, -30, 80);
    sensors.outdoorTempC = normalizeNumber(payload.outdoorTempC, sensors.outdoorTempC, -40, 80);
    sensors.batteryPercent = normalizeNumber(payload.batteryPercent, sensors.batteryPercent, 0, 100);
    sensors.signalStrength = normalizeNumber(payload.signalStrength, sensors.signalStrength, -120, 0);

    if (payload.windowOpenPercent !== undefined) {
      state.actuators.window.openPercent = normalizeNumber(payload.windowOpenPercent, state.actuators.window.openPercent, 0, 100);
      sensors.windowContactOpen = state.actuators.window.openPercent > 0;
    }

    if (payload.blindsPositionPercent !== undefined) {
      state.actuators.blinds.positionPercent = normalizeNumber(
        payload.blindsPositionPercent,
        state.actuators.blinds.positionPercent,
        0,
        100
      );
    }

    if (payload.rainProbability !== undefined) {
      weather.rainProbability = normalizeNumber(payload.rainProbability, weather.rainProbability, 0, 100);
    }

    if (payload.windKph !== undefined) {
      weather.windKph = normalizeNumber(payload.windKph, weather.windKph, 0, 250);
    }

    if (payload.condition) {
      weather.condition = String(payload.condition).slice(0, 80);
    }

    weather.updatedAt = new Date().toISOString();
    state.updatedAt = weather.updatedAt;
    addEvent('info', source, 'Zaprimljena telemetrija', 'Senzorsko stanje je azurirano.');
    const decisions = runAutomation();
    notify();

    return { state: clone(state), decisions };
  }

  function updateWeather(payload = {}) {
    const weather = state.weather;
    weather.condition = payload.condition ? String(payload.condition).slice(0, 80) : weather.condition;
    weather.rainProbability = normalizeNumber(payload.rainProbability, weather.rainProbability, 0, 100);
    weather.windKph = normalizeNumber(payload.windKph, weather.windKph, 0, 250);
    weather.forecastSource = payload.forecastSource ? String(payload.forecastSource).slice(0, 80) : 'api';
    weather.updatedAt = new Date().toISOString();
    state.updatedAt = weather.updatedAt;
    addEvent('info', 'weather', 'Prognoza azurirana', `${weather.condition}, ${weather.rainProbability}% rizika kise.`);
    const decisions = runAutomation();
    notify();

    return { state: clone(state), decisions };
  }

  function updateThresholds(payload = {}) {
    const thresholds = state.automation.thresholds;

    for (const [key, value] of Object.entries(payload)) {
      if (Object.prototype.hasOwnProperty.call(thresholds, key)) {
        thresholds[key] = normalizeNumber(value, thresholds[key], 0, 120000);
      }
    }

    state.updatedAt = new Date().toISOString();
    addEvent('info', 'api', 'Pragovi azurirani', 'Pravila automatizacije su promijenjena.');
    const decisions = runAutomation();
    notify();

    return { state: clone(state), decisions };
  }

  function pollCommands(requestedDeviceId) {
    const id = requestedDeviceId || deviceId;
    return clone(state.commandQueue.filter((command) => command.deviceId === id && command.status === 'pending'));
  }

  function acknowledgeCommand(commandId, status = 'acknowledged') {
    const command = state.commandQueue.find((item) => item.id === commandId);
    if (!command) {
      return null;
    }

    command.status = status;
    command.acknowledgedAt = new Date().toISOString();
    addEvent('success', 'device', 'Komanda potvrdjena', `${command.target}/${command.action} -> ${status}`);
    state.updatedAt = command.acknowledgedAt;
    notify();
    return clone(command);
  }

  function setThingsBoardStatus(status) {
    state.iot = {
      ...state.iot,
      ...status
    };
    state.updatedAt = new Date().toISOString();
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState: () => clone(state),
    subscribe,
    ingestTelemetry,
    updateWeather,
    updateThresholds,
    applyCommand,
    pollCommands,
    acknowledgeCommand,
    setThingsBoardStatus
  };
}

module.exports = {
  createStore
};
