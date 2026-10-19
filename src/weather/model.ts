export interface Place { name: string; description: string; latitude: number; longitude: number }
export interface Settings { locations: Place[]; selected: number; host: string; pinned: boolean }
export interface SettingsResponse { settings: Settings; hasKey: boolean }
export interface Forecast {
  current: { time: string; temperature_2m: number | null; apparent_temperature: number | null; relative_humidity_2m: number | null; weather_code: number; wind_speed_10m: number | null; is_day: number };
  hourly: { time: string[]; temperature_2m: (number | null)[]; precipitation_probability: (number | null)[]; precipitation: (number | null)[]; weather_code: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_probability_max: (number | null)[]; sunrise: string[]; sunset: string[] };
}
export interface Rain { updateTime: string; summary: string; minutely: { fxTime: string; precip: string; type: string }[] }
export interface WeatherData { location: Place; forecast: Forecast | null; forecastFetchedAt: number; minutely: Rain | null; minutelyFetchedAt: number; forecastError: string | null; rainError: string | null; saveError: string | null; qweatherConfigured: boolean }

// Adapted from LuckyIsland's MIT-licensed map_wmo_code. Full notice: THIRD_PARTY_WEATHER.md.
export function weatherCode(code: number): [string, string] {
  if (code === 0) return ['晴', 'sun'];
  if ([1, 2].includes(code)) return ['多云', 'cloud-sun'];
  if (code === 3) return ['阴', 'cloud'];
  if ([45, 48].includes(code)) return ['雾', 'fog'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['毛毛雨', 'rain'];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['雨', 'rain'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['雪', 'snow'];
  if ([95, 96, 99].includes(code)) return ['雷雨', 'storm'];
  return ['暂无数据', 'cloud'];
}
export function number(value: number | null | undefined, suffix = ''): string {
  return value != null && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '—';
}
export function timestamp(value: string): number { return Date.parse(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`); }
export function timeLabel(value: string | number): string { const t = typeof value === 'number' ? value * 1000 : timestamp(value); return Number.isFinite(t) && t > 0 ? new Date(t).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'; }
export function ageLabel(time: number, now = Date.now()): string {
  if (!time) return '尚未获取';
  const age = Math.max(0, Math.floor((now - time * 1000) / 60000));
  return age < 1 ? '刚刚获取' : age < 60 ? `${age} 分钟前获取` : age < 1440 ? `${Math.floor(age / 60)} 小时前获取` : `${Math.floor(age / 1440)} 天前获取`;
}
export function hourlyRows(f: Forecast | null, now = Date.now()) {
  if (!f) return [];
  return f.hourly.time.map((time, i) => ({ time, temp: f.hourly.temperature_2m[i], probability: f.hourly.precipitation_probability[i], precip: f.hourly.precipitation[i], code: f.hourly.weather_code[i] })).filter(row => timestamp(row.time) >= now - 3600000).slice(0, 24);
}
export function futureRain(rain: Rain | null, now = Date.now()) { return (rain?.minutely ?? []).filter(p => timestamp(p.fxTime) >= now - 5 * 60000 && timestamp(p.fxTime) <= now + 2 * 3600000); }
export function rainIsFresh(data: WeatherData | null, now = Date.now()): boolean {
  return !!data?.minutely && !data.rainError && now - data.minutelyFetchedAt * 1000 < 15 * 60000 && now - timestamp(data.minutely.updateTime) < 20 * 60000 && futureRain(data.minutely, now).length > 0;
}
