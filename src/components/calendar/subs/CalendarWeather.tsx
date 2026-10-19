import { EnvironmentOutlined, ReloadOutlined, SettingOutlined, CloseOutlined } from '@ant-design/icons';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ageLabel, futureRain, hourlyRows, number, rainIsFresh, timeLabel, timestamp, weatherCode,
  type Settings, type SettingsResponse, type WeatherData,
} from '../../../weather/model.ts';
import './calendarWeather.css';

const call = <T,>(name: string, args?: Record<string, unknown>): Promise<T> => invoke<T>(name, args);

type WeatherGlyphProps = { code: number; size?: number; night?: boolean; animated?: boolean };
function WeatherGlyph({ code, size = 30, night = false, animated = false }: WeatherGlyphProps) {
  const type = weatherCode(code)[1];
  const sun = type === 'sun' || type === 'cloud-sun';
  const cloud = type !== 'sun';
  const wet = type === 'rain' || type === 'storm';
  const snow = type === 'snow';
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} role="img"
      aria-label={weatherCode(code)[0]} className={'cw-icon cw-icon-' + type + (animated ? ' cw-icon-live' : '')}>
      {sun && (night
        ? <path className="cw-moon" d="M20 6a13 13 0 1 0 15 18A14 14 0 0 1 20 6Z" fill="#eed6a0" />
        : <g className="cw-sun-rays">
            <g stroke="#e6b04f" strokeWidth="2.5" strokeLinecap="round">
              <path d="M23 2v5m0 31v5M2 23h5m31 0h5M8 8l4 4m22 22 4 4M38 8l-4 4M12 34l-4 4" />
            </g>
            <circle cx="23" cy="23" r="11" fill="#f6c467" />
          </g>)}
      {cloud && <>
        <path className="cw-cloud-back" d="M17 33h26c5.5 0 9-3.3 9-8s-3.6-8-8-8c-2-8-7-12-14-12-7.5 0-13 5-14 12C9 17 5 21 5 26c0 4 4.5 7 12 7Z"
          transform="translate(0 5) scale(.95)" fill="#c8dceb" opacity=".65"/>
        <path className="cw-cloud-front" d="M13 38h29c5.7 0 9-4.2 9-9s-4-9-9-9h-2c-2.2-7.5-8-11.4-15-11.4-7.5 0-12.5 5-14.2 11.7-5.3.6-8 4.6-8 8.7C2.8 34 6.4 38 13 38Z"
          fill="#e1edf7" stroke="#83a7c4" strokeWidth="2" strokeLinejoin="round"/>
      </>}
      {wet && <g className="cw-rain-lines" stroke="#4d99cf" strokeWidth="2.5" strokeLinecap="round">
        <path className="cw-drop cw-drop-1" d="M14 43l-3 6"/>
        <path className="cw-drop cw-drop-2" d="M28 43l-3 6"/>
        <path className="cw-drop cw-drop-3" d="M42 43l-3 6"/>
      </g>}
      {snow && <g className="cw-snowflakes" fill="#82b7d5">
        <circle className="cw-flake cw-flake-1" cx="15" cy="46" r="2.3"/>
        <circle className="cw-flake cw-flake-2" cx="27" cy="49" r="2.1"/>
        <circle className="cw-flake cw-flake-3" cx="41" cy="45" r="2.2"/>
      </g>}
      {type === 'storm' && <path className="cw-lightning" d="M30 36l-7 12h6l-3 7 15-15h-9l3-4Z" fill="#ecb44b"/>}
      {type === 'fog' && <g className="cw-fog-lines" stroke="#90aabc" strokeWidth="2.5" strokeLinecap="round">
        <path d="M11 44h33M16 50h23"/>
      </g>}
    </svg>
  );
}

export default function CalendarWeather() {
  const root = useRef<HTMLElement | null>(null);
  const currentSettings = useRef<Settings | null>(null);
  const lastRequest = useRef(0);
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [detailView, setDetailView] = useState<'hours' | 'days'>('hours');

  const retrieve = useCallback(async (settings: Settings, force = false) => {
    const request = ++lastRequest.current;
    setBusy(true);
    try {
      const result = await call<WeatherData>('weather_fetch', { index: settings.selected, force });
      if (request === lastRequest.current) { setData(result); setError(''); }
    } catch (e) {
      if (request === lastRequest.current) setError(String(e));
    } finally {
      if (request === lastRequest.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    void call<SettingsResponse>('weather_settings').then(result => {
      if (!alive) return;
      currentSettings.current = result.settings;
      setConfig(result);
      void retrieve(result.settings);
    }).catch(e => { if (alive) setError(String(e)); });

    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (!document.hidden && currentSettings.current) void retrieve(currentSettings.current);
    }, 60000);
    const listening = listen('calendar-popup-show', () => {
      setEditing(false);
      setClock(Date.now());
      if (currentSettings.current) void retrieve(currentSettings.current);
    }).catch(() => () => {});
    return () => {
      alive = false;
      lastRequest.current++;
      window.clearInterval(timer);
      void listening.then(stop => stop());
    };
  }, [retrieve]);

  useEffect(() => {
    if (!editing) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setEditing(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [editing]);

  const save = async (settings: Settings, key?: string) => {
    setBusy(true);
    try {
      const result = await call<SettingsResponse>('weather_save_settings', { settings, apiKey: key || undefined });
      currentSettings.current = result.settings;
      setConfig(result);
      window.dispatchEvent(new Event('calendar-weather-updated'));
      setDraft(result.settings);
      setApiKey('');
      setEditing(false);
      setData(null);
      await retrieve(result.settings, true);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  };
  const switchPlace = () => {
    if (!config || config.settings.locations.length < 2) return;
    void save({ ...config.settings, selected: (config.settings.selected + 1) % config.settings.locations.length });
  };
  const openSettings = () => {
    if (!config) return;
    setDraft(structuredClone(config.settings));
    setApiKey('');
    setError('');
    setEditing(true);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft) void save(draft, apiKey.trim());
  };

  const place = config?.settings.locations[config.settings.selected];
  const current = data?.forecast?.current;
  const condition = current ? weatherCode(current.weather_code) : null;
  const weatherType = condition?.[1] || 'cloud';
  const hours = hourlyRows(data?.forecast ?? null, clock)
    .filter(h => timestamp(h.time) >= clock - 60 * 60000).slice(0, 6);
  const nowcast = rainIsFresh(data, clock);
  const rainPoints = futureRain(data?.minutely ?? null, clock);
  const nextTwoHours = hourlyRows(data?.forecast ?? null, clock).filter(h => {
    const t = timestamp(h.time);
    return t >= clock - 60 * 60000 && t <= clock + 2 * 3600000;
  });
  const probabilities = nextTwoHours.map(h => h.probability)
    .filter((p): p is number => p != null && Number.isFinite(p));
  const maxChance = probabilities.length ? Math.max(...probabilities) : null;
  const daily = (data?.forecast?.daily.time ?? []).slice(0, 5).map((day, index) => ({
    time: day,
    code: data?.forecast?.daily.weather_code[index] ?? 3,
    high: data?.forecast?.daily.temperature_2m_max[index],
    low: data?.forecast?.daily.temperature_2m_min[index],
    probability: data?.forecast?.daily.precipitation_probability_max[index],
  }));
  const stale = !!data && (!!data.forecastError || clock - data.forecastFetchedAt * 1000 > 45 * 60000);
  const summary = nowcast
    ? data?.minutely?.summary ||
      (rainPoints.some(p => Number(p.precip) > 0) ? '未来两小时可能有降雨' : '未来两小时暂无明显降雨')
    : maxChance != null
      ? '近两小时降雨概率最高 ' + Math.round(maxChance) + '%'
      : '暂无短时降雨参考数据';

  return (
    <section className={'calendar-weather cw-scene-' + weatherType + (detailView === 'days' ? ' cw-detail-days' : '')} ref={root} data-weather-card data-weather-panel aria-label="公司与宿舍天气">
      <div className="cw-main">
        <div className="cw-now">
          <WeatherGlyph code={current?.weather_code ?? 3} size={42} animated night={current?.is_day === 0}/>
          <div className="cw-current">
            <strong>{current ? number(current.temperature_2m, '°') : '—°'}</strong>
            <span>{busy && !current ? '更新中' : condition?.[0] || '天气'}</span>
          </div>
        </div>
        <div className="cw-actions">
          <button type="button" className="cw-location" onClick={switchPlace}
            disabled={!config || config.settings.locations.length < 2}
            aria-label="切换公司与宿舍" title={place?.description || '切换天气地点'}>
            <EnvironmentOutlined /><span>{place?.name || '上海'}</span>
            {(config?.settings.locations.length || 0) > 1 && <span className="cw-arrows">⇄</span>}
          </button>
          <button type="button" className="cw-settings-trigger" onClick={openSettings}
            title="天气设置" aria-label="天气设置"><SettingOutlined /></button>
        </div>
      </div>
      <div className="cw-rain-banner" title={nowcast ? '和风天气分钟级降雨' : 'Open-Meteo 逐小时降雨概率参考，非分钟级临近预报'}>
        <span className="cw-umbrella">☂</span><span>{stale ? '上次预报 · ' : ''}{summary}</span>
      </div>
      <div className="cw-detail-nav">
        <div className="cw-hourly-label"><span>{detailView === 'hours' ? '接下来几小时' : '未来五天'}</span><span>{detailView === 'hours' ? '降雨概率' : '高 / 低 · 雨概率'}</span></div>
        <button type="button" className="cw-detail-toggle" onClick={() => setDetailView(v => v === 'hours' ? 'days' : 'hours')} aria-label={detailView === 'hours' ? '查看未来五天天气' : '返回逐小时天气'} title={detailView === 'hours' ? '查看未来五天天气' : '返回逐小时天气'}>
          {detailView === 'hours' ? '未来几天 ›' : '‹ 逐小时'}
        </button>
      </div>
      <div className="cw-forecast-stage" key={detailView}>
        {detailView === 'hours' ? (
          <div className="cw-hours" role="list" aria-label="逐小时天气与降雨概率">
            {hours.length ? hours.map((h, index) => (
              <div className="cw-hour" role="listitem" key={h.time}>
                <span className="cw-time">{index === 0 ? '现在' : timeLabel(h.time)}</span>
                <WeatherGlyph code={h.code} size={25} />
                <strong>{number(h.temp, '°')}</strong>
                <span className="cw-prob">{number(h.probability, '%')}</span>
              </div>
            )) : <div className="cw-hour-empty">天气数据加载中{error ? ' · 请检查网络' : '…'}</div>}
          </div>
        ) : (
          <div className="cw-days" role="list" aria-label="未来五天天气">
            {daily.length ? daily.map((d, index) => (
              <div className="cw-day" role="listitem" key={d.time}>
                <span className="cw-time">{index === 0 ? '今天' : new Date(timestamp(d.time)).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short' })}</span>
                <WeatherGlyph code={d.code} size={20} />
                <strong>{number(d.high, '°')}</strong>
                <span className="cw-day-low">{number(d.low, '°')}</span>
                <span className="cw-prob">{number(d.probability, '%')}</span>
              </div>
            )) : <div className="cw-hour-empty">未来几天天气暂不可用</div>}
          </div>
        )}
      </div>
      <div className="cw-bottom">
        <span>{nowcast ? '和风降雨 / ' : ''}Open-Meteo · {ageLabel(data?.forecastFetchedAt ?? 0, clock)}</span>
        <button type="button" onClick={() => { if (config) void retrieve(config.settings, true); }}
          disabled={busy || !config} aria-label="刷新天气" title="刷新天气"><ReloadOutlined /></button>
      </div>
      {editing && draft && (
        <div className="cw-settings-overlay" role="dialog" aria-label="天气设置">
          <form className="cw-settings" onSubmit={submit}>
            <div className="cw-settings-heading">
              <strong>天气设置</strong>
              <button type="button" onClick={() => setEditing(false)} aria-label="关闭设置"><CloseOutlined /></button>
            </div>
            <p className="cw-helper">地点为参考坐标，可以按需修改。</p>
            {draft.locations.map((l, i) => (
              <div className="cw-place-editor" key={i}>
                <label>地点<input required maxLength={16} value={l.name} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, name: e.target.value } : v) })}/></label>
                <label>经度<input required type="number" step="any" min="-180" max="180" value={l.longitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, longitude: e.target.valueAsNumber } : v) })}/></label>
                <label>纬度<input required type="number" step="any" min="-90" max="90" value={l.latitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, latitude: e.target.valueAsNumber } : v) })}/></label>
              </div>
            ))}
            <p className="cw-helper">分钟级降雨需单独接入和风天气。基础天气无需账号。</p>
            <label>和风 API Host<input placeholder="xxx.qweatherapi.com" value={draft.host} onChange={e => setDraft({ ...draft, host: e.target.value })}/></label>
            <label>API Key<input type="password" autoComplete="new-password"
              placeholder={config?.hasKey ? '已加密保存，留空不修改' : '可选'}
              value={apiKey} onChange={e => setApiKey(e.target.value)}/></label>
            {error && <p className="cw-error">{error}</p>}
            <button className="cw-save" type="submit" disabled={busy}>保存并刷新</button>
          </form>
        </div>
      )}
    </section>
  );
}
