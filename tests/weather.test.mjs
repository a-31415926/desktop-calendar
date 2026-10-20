import test from 'node:test';
import assert from 'node:assert/strict';
import { number, ageLabel, hourlyRows, futureRain, rainIsFresh, timestamp, weatherCode, weatherIntensity, dateKey, selectedHours, precipitationMotion } from '../src/weather/model.ts';
const now = Date.parse('2026-10-19T23:50:00+08:00');
test('missing measurements never become zero', () => {
  assert.equal(number(null, '%'), '—'); assert.equal(number(undefined), '—'); assert.equal(number(NaN), '—'); assert.equal(number(0, '%'), '0%');
});
test('Shanghai timestamps work independently of the computer timezone', () => {
  assert.equal(timestamp('2026-10-19T23:50'), now);
  assert.equal(timestamp('2026-10-19T15:50Z'), now);
  assert.equal(timestamp('2026-10-20'), Date.parse('2026-10-20T00:00:00+08:00'));
  assert.equal(Number.isFinite(timestamp('2026-10-20')), true);
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

test('precipitation intensity separates light, moderate and heavy conditions', () => {
  assert.equal(weatherIntensity(51), 'light');
  assert.equal(weatherIntensity(63), 'moderate');
  assert.equal(weatherIntensity(65), 'heavy');
  assert.equal(weatherIntensity(71), 'light');
  assert.equal(weatherIntensity(73), 'moderate');
  assert.equal(weatherIntensity(75), 'heavy');
});

test('Chinese weather codes keep rain/snow labels and visibly different motion', () => {
  for (const codes of [[305,306,307], [400,401,402], [61,63,65], [71,73,75]]) {
    const [light, moderate, heavy] = codes.map(c => precipitationMotion(c));
    assert.ok(light.count < moderate.count && moderate.count < heavy.count);
    assert.ok(light.seconds > moderate.seconds && moderate.seconds > heavy.seconds);
    assert.equal(precipitationMotion(codes[2], false).count, 0);
  }
  assert.equal(weatherCode(305)[0], '小雨');
  assert.equal(weatherCode(306)[0], '中雨');
  assert.equal(weatherCode(307)[0], '大雨');
  assert.equal(weatherCode(403)[0], '暴雪');
  assert.equal(precipitationMotion(100).count, 0);
});

test('selected dates never borrow current hourly weather or invent historical forecasts', () => {
  const f = {hourly: {time: ['2026-10-19T23:00+08:00', '2026-10-20T00:00+08:00', '2026-10-20T01:00+08:00'], temperature_2m: [19,20,21], precipitation_probability: [0,80,null], precipitation: [0,1,null], weather_code: [100,305,306]}};
  assert.equal(dateKey(now), '2026-10-19');
  assert.equal(selectedHours(f, '2026-10-19', now).length, 3);
  assert.equal(selectedHours(f, '2026-10-20', now).length, 2);
  assert.equal(selectedHours(f, '2026-10-20', now)[0].temp, 20);
  assert.deepEqual(selectedHours(f, '2026-10-18', now), []);
  assert.deepEqual(selectedHours(f, '2026-10-21', now), []);
  assert.deepEqual(selectedHours(null, '2026-10-20', now), []);
});

