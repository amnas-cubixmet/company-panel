import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJobDirectoryDate } from '../src/components/jobs/jobDirectoryDate.js';

test('job list displays plain dates without ISO formatting', () => {
  assert.equal(formatJobDirectoryDate('2026-11-13'), '13 Nov 2026');
  assert.equal(formatJobDirectoryDate(''), '');
  assert.equal(formatJobDirectoryDate(null), '');
});

test('job list renders UTC microsecond timestamp in India local date and time', () => {
  const displayed = formatJobDirectoryDate('2026-11-13T09:03:39.479816Z');
  assert.match(displayed, /13 Nov 2026/i);
  assert.match(displayed, /2:33\s*pm|02:33\s*pm/i);
  assert.doesNotMatch(displayed, /T09:03|\.479816Z/);
});

test('job list converts UTC timestamps across India calendar day', () => {
  const displayed = formatJobDirectoryDate('2026-11-13T20:30:00.000Z');
  assert.match(displayed, /14 Nov 2026/);
});

test('job list preserves non-date legacy value', () => {
  assert.equal(formatJobDirectoryDate('Workshop service'), 'Workshop service');
});
