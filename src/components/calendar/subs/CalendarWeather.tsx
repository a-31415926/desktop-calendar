import { CloudOutlined, DownOutlined, EnvironmentOutlined, SettingOutlined, UpOutlined } from '@ant-design/icons';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ageLabel, futureRain, hourlyRows, number, rainIsFresh, timeLabel, weatherCode, type Settings, type SettingsResponse, type WeatherData } from '../../../weather/model.ts';
import './calendarWeather.css';

const call = <T,>(name: string, args?: Record<string, unknown>): Promise<T> => invoke<T>(name, args);

export default function CalendarWeather() {
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const currentSettings = useRef<Settings | null>(null);
  const lastRequest = useRef(0);

  const retrieve = useCallback(async (settings: Settings, force = false) => {
    const request = ++lastRequest.current;
    setBusy(true);
    try {
      const value = await call<WeatherData>('weather_fetch', { index: settings.selected, force });
      if (request === lastRequest.current) { setData(value); setError(''); }
    } catch (e) {
      if (request === lastRequest.current) setError(String(e));
    } finally {
      if (request === lastRequest.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let live = true;
    const load = async () => {
      try {
        const result = await call<SettingsResponse>('weather_settings');
        if (!live) return;
        currentSettings.current = result.settings;
        setConfig(result);
        void retrieve(result.settings);
      } catch (e) { if (live) setError(String(e)); }
    };
    void load();
    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (!document.hidden && currentSettings.current) void retrieve(currentSettings.current);
    }, 60000);
    const subscription = listen('calendar-popup-show', () => {
      setClock(Date.now());
      if (currentSettings.current) void retrieve(currentSettings.current);
    }).catch(() => () => {});
    return () => {
      live = false;
      lastRequest.current += 1;
      window.clearInterval(timer);
      void subscription.then(stop => stop());
    };
  }, [retrieve]);

  const save = async (settings: Settings, key?: string) => {
    setBusy(true);
    try {
      const response = await call<SettingsResponse>('weather_save_settings', { settings, apiKey: key || undefined });
      currentSettings.current = response.settings;
      setConfig(response);
      setDraft(response.settings);
      setApiKey('');
      setEditing(false);
      setData(null);
      await retrieve(response.settings, true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const switchPlace = () => {
    if (!config || config.settings.locations.length < 2) return;
    const next = (config.settings.selected + 1) % config.settings.locations.length;
    void save({ ...config.settings, selected: next });
  };
  const openSettings = () => {
    if (!config) return;
    setDraft(structuredClone(config.settings));
    setEditing(true);
    setExpanded(true);
    setError('');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft) void save(draft, apiKey.trim());
  };
  const place = config?.settings.locations[config.settings.selected];
  const current = data?.forecast?.current;
  const weather = current ? weatherCode(current.weather_code) : null;
  const isStale = !!data && !!(data.forecastError || Date.now() / 1000 - data.forecastFetchedAt > 2700);
  const hourly = hourlyRows(data?.forecast ?? null, clock);
  const rain = rainIsFresh(data, clock);
  const rainPoints = futureRain(data?.minutely ?? null, clock);
  // 仅分钟级和风数据能给出短时降雨结论。Open-Meteo 逐小时概率只展示为参考，不冒充临近预报。
  const inTwoHours = hourly.filter(h => {
    const t = Date.parse(h.time.endsWith('Z') || /[+-]\\d{2}:\\d{2}$/.test(h.time) ? h.time : h.time + '+08:00');
    return Number.isFinite(t) && t >= clock - 60 * 60000 && t <= clock + 2 * 3600000;
  });
  const chance = inTwoHours.map(h => h.probability).filter((p): p is number => p != null && Number.isFinite(p));
  const maxChance = chance.length ? Math.max(...chance) : null;
  const summary = rain
    ? (data?.minutely?.summary || (rainPoints.some(p => Number(p.precip) > 0) ? '未来两小时可能有雨' : '未来两小时暂无明显降雨'))
    : maxChance != null
      ? `近2小时降雨概率最高 ${Math.round(maxChance)}% · 逐小时参考`
      : '暂无短时降雨数据';

  return (
    <section className="calendar-weather" data-weather-panel aria-label="天气概览">
      <div className="calendar-weather-line">
        <button className="calendar-weather-location" type="button" onClick={switchPlace} title="切换公司／宿舍天气" disabled={!config || config.settings.locations.length < 2}>
          <EnvironmentOutlined /> <span>{place?.name || '天气'}</span><span className="calendar-weather-switch">{config && config.settings.locations.length > 1 ? '⇄' : ''}</span>
        </button>
        <button type="button" className="calendar-weather-expand" onClick={() => { setExpanded(v => !v); setEditing(false); }} aria-expanded={expanded}>
          <CloudOutlined />
          <strong>{current ? `${number(current.temperature_2m)}° ${weather?.[0]}` : busy ? '获取中…' : '暂无天气'}</strong>
          <span className="calendar-weather-rain">{isStale ? '上次数据 · ' : ''}{data ? summary : '正在连接天气服务'}</span>
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </button>
      </div>
      {expanded && (
        <div className="calendar-weather-details">
          {editing && draft ? (
            <form className="calendar-weather-settings" onSubmit={submit}>
              <div className="calendar-weather-heading">天气设置 <button type="button" onClick={() => setEditing(false)}>返回</button></div>
              {draft.locations.map((location, index) => (
                <div className="calendar-weather-config-place" key={index}>
                  <label>名称 <input maxLength={16} required value={location.name} onChange={e => setDraft({ ...draft, locations: draft.locations.map((l,i) => i === index ? {...l, name: e.target.value} : l) })} /></label>
                  <label>经度 <input type="number" step="any" required min="-180" max="180" value={location.longitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((l,i) => i === index ? {...l, longitude: e.target.valueAsNumber} : l) })} /></label>
                  <label>纬度 <input type="number" step="any" required min="-90" max="90" value={location.latitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((l,i) => i === index ? {...l, latitude: e.target.valueAsNumber} : l) })} /></label>
                </div>
              ))}
              <div className="calendar-weather-help">基础天气无需账号。精准两小时降雨需配置和风天气（可选）。</div>
              <label>和风 API Host <input placeholder="xxx.qweatherapi.com" value={draft.host} onChange={e => setDraft({...draft, host: e.target.value})}/></label>
              <label>API Key <input type="password" autoComplete="new-password" placeholder={config?.hasKey ? '已加密保存，留空不修改' : '未配置'} value={apiKey} onChange={e => setApiKey(e.target.value)}/></label>
              <button type="submit" className="calendar-weather-save" disabled={busy}>保存并刷新</button>
            </form>
          ) : (
            <>
              <div className="calendar-weather-heading"><span>天气详情 · {place?.name}</span><button type="button" title="天气设置" onClick={openSettings}><SettingOutlined /> 设置</button></div>
              <p className="calendar-weather-subtitle">{rain ? summary : `${summary}。分钟级短时降雨${data?.qweatherConfigured ? '暂不可用' : '需另接和风天气'}。`}</p>
              <div className="calendar-weather-hours">
                {hourly.slice(0,4).map(h => <div key={h.time}>
                  <span>{timeLabel(h.time)}</span>
                  <strong>{number(h.temp,'°')}</strong>
                  <span>{number(h.probability, '%')} 雨</span>
                </div>)}
                {hourly.length === 0 && <span className="calendar-weather-help">等待天气数据，请检查网络或刷新</span>}
              </div>
              <div className="calendar-weather-bottom"><span>{ageLabel(data?.forecastFetchedAt ?? 0, clock)} · Open-Meteo{rain ? ' / 和风' : ''}</span><button disabled={busy || !config} type="button" onClick={() => { if (config) void retrieve(config.settings, true); }}>刷新</button></div>
            </>
          )}
          {error && <p className="calendar-weather-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
