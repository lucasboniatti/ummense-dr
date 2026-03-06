import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fromLocalDateTimeInput,
  toLocalDateTimeInput,
} from '../utils/datetime-local';

test('roundtrip UTC <-> local preserves datetime-local value around day boundaries', () => {
  const samples = [
    '2026-03-06T00:05',
    '2026-03-06T23:55',
    '2026-12-31T23:59',
    '2027-01-01T00:01',
  ];

  for (const sample of samples) {
    const utc = fromLocalDateTimeInput(sample);
    assert.ok(utc, `expected UTC value for sample ${sample}`);
    assert.equal(toLocalDateTimeInput(utc), sample);
  }
});

test('DST conversion is correct in America/New_York (before and after spring forward)', (t) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz !== 'America/New_York') {
    t.skip(`Current timezone is ${tz}; run with TZ=America/New_York`);
    return;
  }

  const beforeDst = fromLocalDateTimeInput('2026-03-08T01:30');
  const afterDst = fromLocalDateTimeInput('2026-03-08T03:30');

  assert.equal(beforeDst, '2026-03-08T06:30:00.000Z');
  assert.equal(afterDst, '2026-03-08T07:30:00.000Z');
  assert.equal(toLocalDateTimeInput(beforeDst), '2026-03-08T01:30');
  assert.equal(toLocalDateTimeInput(afterDst), '2026-03-08T03:30');
});

test('invalid values return null/empty guards', () => {
  assert.equal(fromLocalDateTimeInput(''), null);
  assert.equal(fromLocalDateTimeInput('invalid'), null);
  assert.equal(toLocalDateTimeInput(null), '');
  assert.equal(toLocalDateTimeInput('invalid'), '');
});
