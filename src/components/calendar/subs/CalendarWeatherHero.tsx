import type { Dayjs } from 'dayjs';
import type { ReactNode } from 'react';
import {
  number, weatherCode, weatherIntensity, precipitationMotion,
  type WeatherData,
} from '../../../weather/model.ts';
import './calendarWeatherHero.css';


function shanghaiDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function localMinutes(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
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

interface CalendarWeatherHeroProps { selectedDate: Dayjs; children: ReactNode; data: WeatherData | null; clock: number; error: string; actions: ReactNode; stale: boolean }

export default function CalendarWeatherHero({ selectedDate, children, data, clock, error, actions, stale }: CalendarWeatherHeroProps) {
  const selectedKey = selectedDate.format('YYYY-MM-DD');
  const todayKey = shanghaiDateKey(new Date(clock));
  const isToday = selectedKey === todayKey;
  const daily = data?.forecast?.daily;
  const dayIndex = daily?.time.findIndex(value => value === selectedKey) ?? -1;
  const isPast = selectedKey < todayKey;
  const hasDayForecast = dayIndex >= 0 && !isPast;
  const current = data?.forecast?.current;
  const available = isToday ? !!current : hasDayForecast;
  const code = isToday && current ? current.weather_code : hasDayForecast ? (daily?.weather_code[dayIndex] ?? 3) : 3;
  const [condition, scene] = weatherCode(code);
  const intensity = weatherIntensity(code);
  const high = hasDayForecast ? daily?.temperature_2m_max[dayIndex] : null;
  const low = hasDayForecast ? daily?.temperature_2m_min[dayIndex] : null;
  const currentTemp = isToday ? (current?.temperature_2m ?? null) : high;
  const displayCondition = available ? condition : isPast ? '历史天气暂不可用' : data?.forecast ? '暂无天气预报' : '待连接天气';

  // Only today's weather uses the real current daylight state.
  // A selected future date represents its daily (daytime) forecast; do not
  // misleadingly render tomorrow as night just because it is night now.
  let night = false;
  if (isToday) {
    if (current && current.is_day >= 0) {
      night = current.is_day === 0;
    } else {
      const nowMinutes = shanghaiMinutes(new Date(clock));
      const sunrise = hasDayForecast ? localMinutes(daily?.sunrise[dayIndex]) : null;
      const sunset = hasDayForecast ? localMinutes(daily?.sunset[dayIndex]) : null;
      night = sunrise != null && sunset != null
        ? nowMinutes < sunrise || nowMinutes >= sunset
        : nowMinutes < 6 * 60 || nowMinutes >= 18 * 60;
    }
  }

  const wet = scene === 'rain' || scene === 'storm';
  const motion = precipitationMotion(code, available);
  const particleCount = motion.count;
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
                  animationDuration: `${motion.seconds * (0.85 + (index % 5) * 0.075)}s`,
                }}
              />
            ))}
          </div>
        )}
        {scene === 'storm' && available && <div className="wh-lightning" />}
      </div>
      <div className="wh-header-slot">{children}</div>
      <div className="wh-content">
        <div className="wh-eyebrow">
          <span>{stale ? '缓存天气 · ' : ''}{isToday ? '当前天气' : isPast ? `${selectedDate.format('M月D日')} · 历史日期` : `${selectedDate.format('M月D日')}预报`}</span>
          {actions}
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
            : error ? '请查看面板提示或打开天气设置' : isPast ? '当前数据源未提供所选日期的历史天气' : data?.forecast ? '所选日期超出当前预报范围' : '等待连接天气服务'}
        </div>
      </div>
    </section>
  );
}

