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

test('the first screen presents a compact forecast without a nested forecast detail view', () => {
  assert.match(view, /className="cw-glance-hours"/);
  assert.match(view, /未来六小时/);
  assert.match(view, /cw-glance-air/);
  assert.match(view, /className="cw-glance-bottom"/);
  assert.doesNotMatch(view, /setDetailView/);
  assert.doesNotMatch(view, /cw-forecast-toggle/);
  assert.doesNotMatch(view, /<CalendarWeatherExtras/);
  assert.match(view, /hours\.map/);
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
  assert.match(hero, /precipitationMotion/);
});

test('the glance panel labels hourly rain probability and preserves source status', () => {
  assert.match(view, /number\(h\.probability,'%\'\)/);
  assert.match(view, /ageLabel\(data\?\.forecastFetchedAt/);
  assert.match(view, /Open-Meteo/);
  assert.match(view, /cw-glance-status/);
});

test('V13 date info, auspicious days and Windows taskbar hook stay intact', () => {
  for (const token of ['日期信息', '今日宜忌', '距今天']) assert.match(footer, new RegExp(token));
  assert.match(taskbar, /handle_left_click/);
  assert.match(config, /restore_v13_preferences_once/);
});

test('one weather data owner shares current weather with the date-aware calendar', () => {
  assert.match(calendarView, /<CalendarWeather selectedDate=\{model\.headerProps\.selectedDate\}/);
  assert.doesNotMatch(calendarView, /<CalendarWeather\s*\/>/);
  assert.doesNotMatch(hero, /weather_fetch|weather_settings/);
  assert.doesNotMatch(view, /className="cw-now"/);
  assert.match(hero, /selectedDate\.format\('YYYY-MM-DD'\)/);
  assert.match(hero, /time\.findIndex/);
  assert.match(hero, /current\.is_day === 0/);
  assert.match(hero, /localMinutes\(daily\?\.sunrise\[dayIndex\]\)/);
  for (const token of ['wh-scene-sun', 'wh-scene-rain', 'wh-scene-snow', 'wh-scene-storm', 'wh-rain-fall', 'wh-snow-fall', 'wh-sun-breathe', 'wh-moon-glow', 'wh-cloud-drift']) {
    assert.match(heroCss, new RegExp(token));
  }
  assert.match(heroCss, /prefers-reduced-motion: reduce/);
  assert.match(weatherRust, /forecast_days", "7"/);
});

