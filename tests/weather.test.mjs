import test from 'node:test';
import assert from 'node:assert/strict';
import { number, ageLabel, hourlyRows, futureRain, rainIsFresh, timestamp, weatherCode } from '../src/weather/model.ts';
const now = Date.parse('2026-10-19T23:50:00+08:00');
test('missing measurements never become zero', () => {
  assert.equal(number(null, '%'), '—'); assert.equal(number(undefined), '—'); assert.equal(number(NaN), '—'); assert.equal(number(0, '%'), '0%');
});
test('Shanghai timestamps work independently of the computer timezone', () => {
  assert.equal(timestamp('2026-10-19T23:50'), now);
  assert.equal(timestamp('2026-10-19T15:50Z'), now);
});
test('hourly forecast spans midnight and excludes expired rows', () => {
  const f = { hourly: { time: ['2026-10-19T20:00', '2026-10-19T23:00', '2026-10-20T00:00'], temperature_2m: [20, 21, 22], precipitation_probability: [null, 0, 80], precipitation: [0, 0, 1], weather_code: [0, 3, 61] } };
  const rows = hourlyRows(f, now); assert.equal(rows.length, 2); assert.equal(rows[1].probability, 80);
});
test('old nowcasts cannot masquerade as live rain predictions', () => {
  const minutely = { updateTime: '2026-10-19T23:45+08:00', minutely: [{ fxTime: '2026-10-19T21:00+08:00', precip: '0.1' }, { fxTime: '2026-10-20T00:00+08:00', precip: '0' }] };
  const data = { minutely, minutelyFetchedAt: now / 1000, rainError: null };
  assert.equal(futureRain(minutely, now).length, 1); assert.equal(rainIsFresh(data, now), true);
  assert.equal(rainIsFresh({ ...data, rainError: 'offline' }, now), false);
  assert.equal(rainIsFresh({ ...data, minutelyFetchedAt: now / 1000 - 1200 }, now), false);
  assert.equal(rainIsFresh({ ...data, minutely: { ...minutely, updateTime: '2026-10-19T20:00+08:00' } }, now), false);
  assert.equal(rainIsFresh(null, now), false);
});
test('cache age and unknown weather remain explicit', () => {
  assert.equal(ageLabel(0, now), '尚未获取'); assert.equal(ageLabel(now / 1000 - 3600, now), '1 小时前获取'); assert.equal(weatherCode(999)[0], '暂无数据');
});
