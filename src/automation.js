'use strict';

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
}

function evaluateAutomation(state) {
  if (state.automation.mode !== 'auto') {
    return [];
  }

  const decisions = [];
  const sensors = state.sensors;
  const weather = state.weather;
  const thresholds = state.automation.thresholds;
  const windowOpenPercent = state.actuators.window.openPercent;
  const blindsPercent = state.actuators.blinds.positionPercent;

  const rainRisk =
    Boolean(sensors.rainDetected) ||
    Number(sensors.rainIntensity) > thresholds.rainIntensityClose ||
    Number(weather.rainProbability) >= thresholds.rainProbabilityClose;

  const windRisk = Number(weather.windKph) >= thresholds.windKphClose;
  const strongSun =
    Number(sensors.lightLux) >= thresholds.lightLuxShade &&
    Number(sensors.indoorTempC) >= thresholds.indoorTempShadeC;
  const lowLight = Number(sensors.lightLux) <= thresholds.lightLuxRelease;

  if ((rainRisk || windRisk) && windowOpenPercent > 0) {
    decisions.push({
      target: 'window',
      action: 'close',
      positionPercent: 0,
      reason: rainRisk ? 'Detektirana je kisa ili visok rizik oborina.' : 'Brzina vjetra prelazi sigurni prag.'
    });
  }

  if (strongSun && blindsPercent < thresholds.blindsShadePosition) {
    decisions.push({
      target: 'blinds',
      action: 'setPosition',
      positionPercent: thresholds.blindsShadePosition,
      reason: 'Visok intenzitet svjetlosti i temperatura zahtijevaju zasjenu.'
    });
  }

  if (!rainRisk && lowLight && blindsPercent > thresholds.blindsReleasePosition) {
    decisions.push({
      target: 'blinds',
      action: 'setPosition',
      positionPercent: thresholds.blindsReleasePosition,
      reason: 'Svjetlost je niska, rolete se vracaju u otvoreniji polozaj.'
    });
  }

  return decisions;
}

function createDefaultState(deviceId = 'windowsense-esp32-01') {
  const now = new Date().toISOString();

  return {
    site: {
      name: 'WindowSense Lab',
      area: 'Pametna ucionica',
      deviceId
    },
    sensors: {
      rainDetected: false,
      rainIntensity: 0,
      lightLux: 42000,
      windowContactOpen: true,
      indoorTempC: 24.8,
      outdoorTempC: 20.9,
      batteryPercent: 94,
      signalStrength: -58
    },
    weather: {
      condition: 'Djelomicno suncano',
      rainProbability: 18,
      windKph: 12,
      forecastSource: 'simulated',
      updatedAt: now
    },
    actuators: {
      window: {
        openPercent: 65,
        status: 'idle',
        lastCommandAt: null
      },
      blinds: {
        positionPercent: 30,
        status: 'idle',
        lastCommandAt: null
      }
    },
    automation: {
      mode: 'auto',
      lastDecisionAt: null,
      thresholds: {
        rainIntensityClose: 0,
        rainProbabilityClose: 55,
        windKphClose: 45,
        lightLuxShade: 55000,
        lightLuxRelease: 16000,
        indoorTempShadeC: 25,
        blindsShadePosition: 85,
        blindsReleasePosition: 20
      }
    },
    iot: {
      platform: 'ThingsBoard',
      connection: 'not_configured',
      lastSyncAt: null,
      lastError: null
    },
    commandQueue: [],
    events: [
      {
        id: 'evt-initial',
        ts: now,
        level: 'info',
        source: 'system',
        title: 'Sustav spreman',
        details: 'Pokrenut je WindowSense web backend s lokalnim simuliranim stanjem.'
      }
    ],
    updatedAt: now
  };
}

function telemetrySnapshot(state) {
  return {
    rainDetected: state.sensors.rainDetected,
    rainIntensity: state.sensors.rainIntensity,
    lightLux: state.sensors.lightLux,
    windowContactOpen: state.sensors.windowContactOpen,
    windowOpenPercent: state.actuators.window.openPercent,
    blindsPositionPercent: state.actuators.blinds.positionPercent,
    indoorTempC: state.sensors.indoorTempC,
    outdoorTempC: state.sensors.outdoorTempC,
    rainProbability: state.weather.rainProbability,
    windKph: state.weather.windKph,
    automationMode: state.automation.mode,
    batteryPercent: state.sensors.batteryPercent,
    signalStrength: state.sensors.signalStrength
  };
}

module.exports = {
  clamp,
  createDefaultState,
  evaluateAutomation,
  telemetrySnapshot
};
