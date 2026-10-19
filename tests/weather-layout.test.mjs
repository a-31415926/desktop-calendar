import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync('src/components/calendar/subs/CalendarWeather.tsx', 'utf8');
const hero = readFileSync('src/components/calendar/subs/CalendarWeatherHero.tsx', 'utf8');
const heroCss = readFileSync('src/components/calendar/subs/calendarWeatherHero.css', 'utf8');
const calendarView = readFileSync('src/components/calendar/CalendarView.tsx', 'utf8');
const weatherRust = readFileSync('src-tauri/src/weather.rs', 'utf8');
const css = readFileSync('src/components/calendar/subs/calendarWeather.css', 'utf8');
const grid = readFileSync('src/components/calendar/subs/CalendarMonthGrid.tsx', 'utf8');
const footer = readFileSync('src/components/calendar/subs/CalendarFooter.tsx', 'utf8');
const taskbar = readFileSync('src-tauri/src/app_runtime/windows/hook_runtime.rs', 'utf8');
const config = readFileSync('src-tauri/src/app_runtime/config.rs', 'utf8');

test('hourly and five-day forecasts switch within a fixed-height stage', () => {
  assert.match(view, /setDetailView/);
  assert.match(view, /查看未来五天天气/);
  assert.match(view, /返回逐小时天气/);
  assert.match(view, /className="cw-hours"/);
  assert.match(view, /className="cw-days"/);
  assert.match(view, /temperature_2m_max/);
  assert.match(view, /precipitation_probability_max/);
  assert.match(css, /\.cw-forecast-stage\s*\{[^}]*height:67px/s);
  assert.match(css, /\.cw-hours\s*\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.cw-days\s*\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/s);
  assert.match(view, /\.slice\(0, 6\)/);
  assert.match(css, /\.cw-settings-overlay\s*\{[^}]*position:absolute/s);
});

test('month grid always renders all 42 cells to prevent month-change resize jumps', () => {
  assert.match(grid, /const visibleCells = cellModels;/);
  assert.doesNotMatch(grid, /cellModels\[35\].*isOtherMonth/);
});

test('weather ambience differs by condition and respects reduced-motion settings', () => {
  for (const token of [
    'cw-sun-turn', 'cw-cloud-float', 'cw-falling-rain', 'cw-falling-snow',
    'cw-fog-float', 'cw-lightning-flash', 'cw-sun-glow', 'cw-cloud-haze',
    'cw-rain-sheet', 'cw-snow-sheet', 'cw-storm-flash',
  ]) assert.match(css, new RegExp(token));
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(view, /animated\s+night=/);
});

test('hourly precipitation probability is labeled, not claimed as rain amount', () => {
  assert.match(view, /降雨概率/);
  assert.match(view, /雨概率最高/);
  assert.match(view, /rainIsFresh/);
  assert.match(view, /Open-Meteo/);
});

test('V13 date info, auspicious days and Windows taskbar hook stay intact', () => {
  for (const token of ['日期信息', '今日宜忌', '距今天']) assert.match(footer, new RegExp(token));
  assert.match(taskbar, /handle_left_click/);
  assert.match(config, /restore_v13_preferences_once/);
});

test('selected date controls a dedicated animated weather hero above the calendar', () => {
  assert.match(calendarView, /<CalendarWeatherHero selectedDate=\{model\.headerProps\.selectedDate\}/);
  assert.match(hero, /selectedDate\.format\('YYYY-MM-DD'\)/);
  assert.match(hero, /daily\.time\.findIndex/);
  assert.match(hero, /current\.is_day === 0/);
  assert.match(hero, /localMinutes\(daily\.sunrise\[dayIndex\]\)/);
  for (const token of ['wh-scene-sun', 'wh-scene-rain', 'wh-scene-snow', 'wh-scene-storm', 'wh-rain-fall', 'wh-snow-fall', 'wh-sun-breathe', 'wh-moon-glow', 'wh-cloud-drift']) {
    assert.match(heroCss, new RegExp(token));
  }
  assert.match(heroCss, /prefers-reduced-motion: reduce/);
  assert.match(weatherRust, /forecast_days", "7"/);
});
