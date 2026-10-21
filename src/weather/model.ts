import type { WeatherExtras } from './extras.ts';
export interface Place { name: string; description: string; latitude: number; longitude: number }
export interface Settings { locations: Place[]; selected: number; host: string; pinned: boolean; provider: 'qweather' | 'open-meteo' }
export interface SettingsResponse { settings: Settings; hasKey: boolean }
export interface Forecast {
  attributions?: string[];
  current: { uv_index?: number | null; time: string; temperature_2m: number | null; apparent_temperature: number | null; relative_humidity_2m: number | null; weather_code: number; wind_speed_10m: number | null; is_day: number };
  hourly: { uv_index?: (number | null)[]; time: string[]; temperature_2m: (number | null)[]; precipitation_probability: (number | null)[]; precipitation: (number | null)[]; weather_code: number[] };
  daily: { wind_speed_10m_max?: (number | null)[]; uv_index_max?: (number | null)[]; time: string[]; weather_code: number[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_probability_max: (number | null)[]; sunrise: string[]; sunset: string[] };
}
export interface Rain { updateTime: string; summary: string; minutely: { fxTime: string; precip: string; type: string }[] }
export interface WeatherData { extras?: WeatherExtras; provider?: 'qweather' | 'open-meteo'; location: Place; forecast: Forecast | null; forecastFetchedAt: number; minutely: Rain | null; minutelyFetchedAt: number; forecastError: string | null; rainError: string | null; saveError: string | null; qweatherConfigured: boolean }

// Adapted from LuckyIsland's MIT-licensed map_wmo_code. Full notice: THIRD_PARTY_WEATHER.md.
export function weatherCode(code: number): [string, string] {
  const qweather: Record<number, [string, string]> = {
    100: ['晴','sun'], 150: ['晴','sun'], 101: ['多云','cloud'], 102: ['少云','cloud'], 103: ['晴间多云','cloud-sun'], 151: ['多云','cloud'], 152: ['少云','cloud'], 153: ['晴间多云','cloud-sun'], 104: ['阴','cloud'],
    300: ['阵雨','rain'], 301: ['强阵雨','rain'], 302: ['雷阵雨','storm'], 303: ['强雷阵雨','storm'], 304: ['雷雨冰雹','storm'], 305: ['小雨','rain'], 306: ['中雨','rain'], 307: ['大雨','rain'], 308: ['极端降雨','rain'], 309: ['毛毛雨','rain'], 310: ['暴雨','rain'], 311: ['大暴雨','rain'], 312: ['特大暴雨','rain'], 313: ['冻雨','rain'], 314: ['小到中雨','rain'], 315: ['中到大雨','rain'], 316: ['大到暴雨','rain'], 317: ['暴雨到大暴雨','rain'], 318: ['大暴雨到特大暴雨','rain'], 350: ['阵雨','rain'], 351: ['强阵雨','rain'], 399: ['雨','rain'],
    400: ['小雪','snow'], 401: ['中雪','snow'], 402: ['大雪','snow'], 403: ['暴雪','snow'], 404: ['雨夹雪','snow'], 405: ['雨雪','snow'], 406: ['阵雨夹雪','snow'], 407: ['阵雪','snow'], 408: ['小到中雪','snow'], 409: ['中到大雪','snow'], 410: ['大到暴雪','snow'], 456: ['阵雨夹雪','snow'], 457: ['阵雪','snow'], 499: ['雪','snow'],
    500: ['薄雾','fog'], 501: ['雾','fog'], 502: ['霾','fog'], 503: ['扬沙','fog'], 504: ['浮尘','fog'], 507: ['沙尘暴','fog'], 508: ['强沙尘暴','fog'], 509: ['浓雾','fog'], 510: ['强浓雾','fog'], 511: ['中度霾','fog'], 512: ['重度霾','fog'], 513: ['严重霾','fog'], 514: ['大雾','fog'], 515: ['特强浓雾','fog'],
  };
  if (qweather[code]) return qweather[code];
  if (code === 0) return ['晴', 'sun'];
  if ([1, 2].includes(code)) return ['多云', 'cloud'];
  if (code === 3) return ['阴', 'cloud'];
  if ([45, 48].includes(code)) return ['雾', 'fog'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['毛毛雨', 'rain'];
  if ([61, 80].includes(code)) return ['小雨', 'rain'];
  if ([63, 66, 81].includes(code)) return ['中雨', 'rain'];
  if ([65, 67, 82].includes(code)) return ['大雨', 'rain'];
  if ([71, 77].includes(code)) return ['小雪', 'snow'];
  if ([73, 85].includes(code)) return ['中雪', 'snow'];
  if ([75, 86].includes(code)) return ['大雪', 'snow'];
  if ([95, 96, 99].includes(code)) return ['雷雨', 'storm'];
  return ['暂无数据', 'cloud'];
}
export function number(value: number | null | undefined, suffix = ''): string {
  return value != null && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '—';
}
export function timestamp(value: string): number {
  // Open-Meteo daily dates are date-only strings. Appending +08:00 directly
  // creates an invalid timestamp in Chromium; normalize to Shanghai midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(`${value}T00:00:00+08:00`);
  return Date.parse(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`);
}
export type WeatherIntensity = 'light' | 'moderate' | 'heavy';
export function weatherIntensity(code: number): WeatherIntensity {
  if ([55, 57, 65, 67, 75, 82, 86, 99, 301, 303, 304, 307, 308, 310, 311, 312, 315, 316, 317, 318, 351, 402, 403, 409, 410].includes(code)) return 'heavy';
  if ([53, 56, 63, 66, 73, 81, 85, 96, 302, 306, 313, 314, 401, 404, 405, 406, 408, 456].includes(code)) return 'moderate';
  return 'light';
}
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


export function dateKey(now = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
export function selectedHours(f: Forecast | null, selected: string, now = Date.now()) {
  if (!f || selected < dateKey(now)) return [];
  const cutoff = selected === dateKey(now) ? now - 3600000 : timestamp(selected);
  return f.hourly.time.map((time, i) => ({time, uv:f.hourly.uv_index?.[i]??null, temp: f.hourly.temperature_2m[i], probability: f.hourly.precipitation_probability[i], precip: f.hourly.precipitation[i], code: f.hourly.weather_code[i]}))
    .filter(h => timestamp(h.time) >= cutoff && (selected === dateKey(now) || dateKey(timestamp(h.time)) === selected)).slice(0, 6);
}
export function precipitationMotion(code: number, available = true) {
  const scene = weatherCode(code)[1], intensity = weatherIntensity(code);
  const wet = scene === 'rain' || scene === 'storm';
  const snowy = scene === 'snow';
  return { count: !available ? 0 : wet ? ([300,350].includes(code)?24:{ light: 16, moderate: 34, heavy: 68 }[intensity]) : snowy ? { light: 10, moderate: 28, heavy: 56 }[intensity] : 0,
    seconds: wet ? ([300,350].includes(code)?0.78:{ light: 1.05, moderate: 0.7, heavy: 0.44 }[intensity]) : { light: 7.4, moderate: 4.8, heavy: 2.9 }[intensity] };
}
