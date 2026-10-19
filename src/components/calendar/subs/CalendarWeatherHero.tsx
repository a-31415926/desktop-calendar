import { EnvironmentOutlined } from '@ant-design/icons';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  number, weatherCode, weatherIntensity,
  type SettingsResponse, type WeatherData,
} from '../../../weather/model.ts';
import './calendarWeatherHero.css';

const call = <T,>(name: string, args?: Record<string, unknown>): Promise<T> => invoke<T>(name, args);

function shanghaiDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function localMinutes(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/T(\\d{2}):(\\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function shanghaiMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 12);
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

interface CalendarWeatherHeroProps { selectedDate: Dayjs; children: ReactNode }

export default function CalendarWeatherHero({ selectedDate, children }: CalendarWeatherHeroProps) {
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!isTauri()) return;
    try {
      const settings = await call<SettingsResponse>('weather_settings');
      setConfig(settings);
      const weather = await call<WeatherData>('weather_fetch', { index: settings.settings.selected, force });
      setData(weather);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void load();
    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (!document.hidden) void load();
    }, 5 * 60 * 1000);
    const popupListener = listen('calendar-popup-show', () => {
      setClock(Date.now());
      void load();
    }).catch(() => () => {});
    const onWeatherUpdated = () => { void load(); };
    window.addEventListener('calendar-weather-updated', onWeatherUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('calendar-weather-updated', onWeatherUpdated);
      void popupListener.then(stop => stop());
    };
  }, [load]);

  const selectedKey = selectedDate.format('YYYY-MM-DD');
  const todayKey = shanghaiDateKey(new Date(clock));
  const isToday = selectedKey === todayKey;
  const daily = data?.forecast?.daily;
  const dayIndex = daily?.time.findIndex(value => value === selectedKey) ?? -1;
  const hasDayForecast = dayIndex >= 0;
  const current = data?.forecast?.current;
  const available = isToday ? !!current : hasDayForecast;
  const code = isToday && current ? current.weather_code : hasDayForecast ? (daily?.weather_code[dayIndex] ?? 3) : 3;
  const [condition, scene] = weatherCode(code);
  const intensity = weatherIntensity(code);
  const place = config?.settings.locations[config.settings.selected];
  const high = hasDayForecast ? daily?.temperature_2m_max[dayIndex] : null;
  const low = hasDayForecast ? daily?.temperature_2m_min[dayIndex] : null;
  const currentTemp = isToday ? (current?.temperature_2m ?? high) : high;
  const isPast = selectedKey < todayKey;
  const displayCondition = available ? condition : isPast ? '历史天气暂不可用' : '暂无天气预报';

  let night = false;
  if (isToday && current) {
    night = current.is_day === 0;
  } else if (hasDayForecast && daily) {
    const nowMinutes = shanghaiMinutes(new Date(clock));
    const sunrise = localMinutes(daily.sunrise[dayIndex]);
    const sunset = localMinutes(daily.sunset[dayIndex]);
    night = sunrise != null && sunset != null
      ? nowMinutes < sunrise || nowMinutes >= sunset
      : nowMinutes < 6 * 60 || nowMinutes >= 18 * 60;
  } else {
    const nowMinutes = shanghaiMinutes(new Date(clock));
    night = nowMinutes < 6 * 60 || nowMinutes >= 18 * 60;
  }

  const wet = scene === 'rain' || scene === 'storm';
  const snowy = scene === 'snow';
  const particleCount = !available ? 0 : wet
    ? intensity === 'heavy' ? 24 : intensity === 'moderate' ? 16 : 9
    : snowy ? intensity === 'heavy' ? 22 : intensity === 'moderate' ? 15 : 8 : 0;
  const particles = Array.from({ length: particleCount }, (_, index) => index);
  const clouded = ['cloud', 'cloud-sun', 'rain', 'storm', 'snow', 'fog'].includes(scene);
  const sunny = scene === 'sun' || scene === 'cloud-sun';

  return (
    <section
      className={`calendar-weather-hero wh-scene-${scene} ${night ? 'wh-night' : 'wh-day'} wh-intensity-${intensity}`}
      aria-label={`${selectedDate.format('M月D日')}天气：${displayCondition}`}
    >
      <div className="wh-atmosphere" key={`${selectedKey}-${scene}-${night}-${intensity}`} aria-hidden="true">
        <div className="wh-sky-glow" />
        {sunny && !night && <div className="wh-sun" />}
        {night && <><div className="wh-moon" /><i className="wh-star wh-star-a" /><i className="wh-star wh-star-b" /><i className="wh-star wh-star-c" /><i className="wh-star wh-star-d" /></>}
        {clouded && <><div className="wh-cloud wh-cloud-back" /><div className="wh-cloud wh-cloud-front" /></>}
        {scene === 'fog' && <><div className="wh-fog-band wh-fog-a" /><div className="wh-fog-band wh-fog-b" /></>}
        {particleCount > 0 && (
          <div className={`wh-particles ${wet ? 'wh-rain-particles' : 'wh-snow-particles'}`}>
            {particles.map(index => (
              <span
                className="wh-particle"
                key={index}
                style={{
                  left: `${(index * 37 + 7) % 97}%`,
                  animationDelay: `-${((index * 13) % 29) / 10}s`,
                  animationDuration: wet
                    ? `${intensity === 'heavy' ? 0.72 : intensity === 'moderate' ? 1.05 : 1.55}s`
                    : `${intensity === 'heavy' ? 3.4 : intensity === 'moderate' ? 4.7 : 6.2}s`,
                }}
              />
            ))}
          </div>
        )}
        {scene === 'storm' && available && <div className="wh-lightning" />}
      </div>
      <div className="wh-header-slot">{children}</div>
      <div className="wh-content" key={`${selectedKey}-${scene}-${night}`}>
        <div className="wh-eyebrow">
          <span>{isToday ? '实时天气' : '所选日期天气'}</span>
          <span className="wh-place"><EnvironmentOutlined />{place?.name || '上海'}</span>
        </div>
        <div className="wh-primary">
          <strong>{displayCondition}</strong>
          <span className="wh-temperature">{available ? number(currentTemp, '°') : '—°'}</span>
          {!isToday && hasDayForecast && <span className="wh-temp-range">/ {number(low, '°')}</span>}
        </div>
        <div className="wh-meta">
          {available
            ? isToday
              ? `体感 ${number(current?.apparent_temperature, '°')} · 最高 ${number(high, '°')} / 最低 ${number(low, '°')}`
              : `最高 ${number(high, '°')} · 最低 ${number(low, '°')} · ${night ? '夜间' : '白天'}预报`
            : error ? '天气数据暂不可用，请检查连接' : isPast ? '当前数据源未提供所选日期的历史天气' : '所选日期超出当前预报范围'}
        </div>
      </div>
    </section>
  );
}
