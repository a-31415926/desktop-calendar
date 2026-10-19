import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const component=readFileSync('src/components/calendar/subs/CalendarWeather.tsx','utf8');
const css=readFileSync('src/components/calendar/subs/calendarWeather.css','utf8');
const footer=readFileSync('src/components/calendar/subs/CalendarFooter.tsx','utf8');
const hook=readFileSync('src-tauri/src/app_runtime/windows/hook_runtime.rs','utf8');

test('weather details are an absolute overlay, not an expanding layout block', () => {
  assert.match(css, /\.calendar-weather-popover\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /bottom:\s*calc\(100% \+ 8px\)/);
  assert.match(component,/className="calendar-weather-popover"/);
  assert.doesNotMatch(css, /\.calendar-weather-popover\s*\{[^}]*position:\s*relative/s);
});
test('hourly chance is described as a probability, not a rain guarantee', () => {
  assert.match(component,/逐小时降雨概率/);
  assert.match(component,/降雨概率/);
  assert.match(component,/rainIsFresh/);
});
test('V13 date info, 宜忌, taskbar clock listener are retained', () => {
  assert.match(footer,/日期信息/);
  assert.match(footer,/今日宜忌/);
  assert.match(footer,/距今天/);
  assert.match(hook,/handle_left_click/);
});
test('weather overlay closes outside and by Escape', () => {
  assert.match(component,/pointerdown/);
  assert.match(component,/Escape/);
});
