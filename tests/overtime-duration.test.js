import test from 'node:test';
import assert from 'node:assert/strict';
import { splitOvertimeMinutes, toOvertimeMinutes, formatOvertimeDuration } from '../src/utils/overtimeDuration.js';

test('Hours : Minutes inputs convert to exact integer minutes', () => {
  assert.equal(toOvertimeMinutes('01', '20'), 80);
  assert.equal(toOvertimeMinutes('02', '25'), 145);
  assert.equal(toOvertimeMinutes('', '20'), 20);
  assert.equal(toOvertimeMinutes('01', ''), 60);
  assert.equal(toOvertimeMinutes('00', '01'), 1);
});

test('detected minutes round-trip into Hours and Minutes without loss', () => {
  for (const minutes of [1, 20, 59, 60, 80, 140, 145, 1439, 1440]) {
    const parts = splitOvertimeMinutes(minutes);
    assert.equal(toOvertimeMinutes(parts.hours, parts.minutes), minutes);
  }
  assert.deepEqual(splitOvertimeMinutes(80), { hours: '01', minutes: '20' });
  assert.equal(formatOvertimeDuration(80), '01 hr 20 min');
});

test('invalid or zero overtime durations are rejected', () => {
  for (const [hours, minutes] of [
    ['', ''], ['0', '0'], ['1', '60'], ['24', '01'], ['25', '00'],
    ['-1', '20'], ['1.5', '0'], ['aa', '10'],
  ]) {
    assert.equal(toOvertimeMinutes(hours, minutes), null);
  }
});
