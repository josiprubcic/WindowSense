'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultState, evaluateAutomation } = require('../src/automation');

test('automation closes the window when rain is detected', () => {
  const state = createDefaultState();
  state.sensors.rainDetected = true;
  state.actuators.window.openPercent = 70;

  const decisions = evaluateAutomation(state);

  assert.equal(decisions[0].target, 'window');
  assert.equal(decisions[0].action, 'close');
  assert.equal(decisions[0].positionPercent, 0);
});

test('automation lowers blinds on strong light and high indoor temperature', () => {
  const state = createDefaultState();
  state.sensors.lightLux = 80000;
  state.sensors.indoorTempC = 27;
  state.actuators.blinds.positionPercent = 10;

  const decisions = evaluateAutomation(state);

  assert.equal(decisions.some((decision) => decision.target === 'blinds' && decision.positionPercent === 85), true);
});

test('manual mode does not create automation decisions', () => {
  const state = createDefaultState();
  state.automation.mode = 'manual';
  state.sensors.rainDetected = true;
  state.actuators.window.openPercent = 70;

  assert.deepEqual(evaluateAutomation(state), []);
});
