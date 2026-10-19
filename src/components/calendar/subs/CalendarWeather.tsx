import { DownOutlined, EnvironmentOutlined, SettingOutlined, UpOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ageLabel, futureRain, hourlyRows, number, rainIsFresh, timeLabel, timestamp, weatherCode, type Settings, type SettingsResponse, type WeatherData } from '../../../weather/model.ts';
import './calendarWeather.css';

const call = <T,>(name: string, args?: Record<string, unknown>): Promise<T> => invoke<T>(name, args);


type WeatherGlyphProps = { code: number; size?: number; night?: boolean };
function WeatherGlyph({ code, size = 34, night = false }: WeatherGlyphProps) {
  const kind = weatherCode(code)[1];
  const sunny = kind === 'sun' || kind === 'cloud-sun';
  const precipitation = ['rain', 'snow', 'storm'].includes(kind);
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="cw-glyph">
      {sunny && <g className="cw-glyph-sun">
        {night ? <path d="M19 4a12 12 0 1 0 12 16A12.3 12.3 0 0 1 19 4Z" fill="#f3cb78"/> : <>
          <circle cx="19" cy="17" r="8" fill="#f7c05f"/>
          <path d="M19 3v4m0 20v4M5 17h4m20 0h4M9 7l3 3m14 14 3 3M29 7l-3 3M12 24l-3 3" stroke="#eeb154" strokeWidth="2" strokeLinecap="round"/>
        </>}
      </g>}
      {kind !== 'sun' && <path d="M11 36h26c6 0 10-4.5 10-10s-4-9-9-9h-2C34 9 29 6 23 6c-7 0-12 4.5-13 11-6 0-9 4-9 9s4.2 10 10 10Z"
        transform="translate(2 4) scale(.91)" fill="#d8e7f4" stroke="#759bb9" strokeWidth="2.4" strokeLinejoin="round"/>}
      {kind === 'fog' && <g stroke="#8aa3b5" strokeWidth="2.4" strokeLinecap="round"><path d="M13 40h22M18 44h18"/></g>}
      {precipitation && <g stroke={kind === 'snow' ? '#91b6d2' : '#5c9dd3'} strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 39l-2 4M27 39l-2 4M36 39l-2 4"/>
      </g>}
      {kind === 'storm' && <path d="M27 34l-6 8h6l-3 5 11-10h-6l3-3Z" fill="#efc05c"/>}
    </svg>
  );
}

export default function CalendarWeather() {
  const root = useRef<HTMLElement | null>(null);
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
      const result = await call<WeatherData>('weather_fetch', { index: settings.selected, force });
      if (request === lastRequest.current) { setData(result); setError(''); }
    } catch (err) {
      if (request === lastRequest.current) setError(String(err));
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
    }).catch(err => { if (alive) setError(String(err)); });

    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (!document.hidden && currentSettings.current) void retrieve(currentSettings.current);
    }, 60000);
    const listening = listen('calendar-popup-show', () => {
      setExpanded(false);
      setEditing(false);
      setClock(Date.now());
      if (currentSettings.current) void retrieve(currentSettings.current);
    }).catch(() => () => {});
    return () => {
      alive = false;
      lastRequest.current++;
      window.clearInterval(timer);
      void listening.then(unlisten => unlisten());
    };
  }, [retrieve]);

  // 纯浮层，不参与日历窗口高度测量。点外面或按 ESC 即关闭。
  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setExpanded(false);
        setEditing(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setExpanded(false); setEditing(false); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [expanded]);

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
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  };
  const switchPlace = () => {
    if (!config || config.settings.locations.length < 2) return;
    const selected = (config.settings.selected + 1) % config.settings.locations.length;
    void save({ ...config.settings, selected });
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
  const code = current?.weather_code ?? 3;
  const condition = current ? weatherCode(code)[0] : '天气';
  const stale = !!data && (!!data.forecastError || clock - data.forecastFetchedAt * 1000 > 45 * 60000);
  const hourly = hourlyRows(data?.forecast ?? null, clock);
  const hours = hourly.filter(row => timestamp(row.time) >= clock - 60 * 60000).slice(0, 5);
  const nowcast = rainIsFresh(data, clock);
  const rainPoints = futureRain(data?.minutely ?? null, clock);
  const nextTwoHours = hourly.filter(row => {
    const t = timestamp(row.time);
    return t >= clock - 60 * 60000 && t <= clock + 2 * 3600000;
  });
  const validProbabilities = nextTwoHours.map(h => h.probability).filter((n): n is number => n != null && Number.isFinite(n));
  const maxChance = validProbabilities.length ? Math.max(...validProbabilities) : null;
  // 逐小时预报 != 分钟级临近降雨。没有和风数据时绝不声称短时一定不下雨。
  const summary = nowcast
    ? data?.minutely?.summary || (rainPoints.some(p => Number(p.precip) > 0) ? '未来两小时有降雨信号' : '未来两小时无明显降雨信号')
    : maxChance != null
      ? `近两小时逐小时降雨概率最高 ${Math.round(maxChance)}%`
      : '短时降雨预测暂不可用';

  return (
    <section className="calendar-weather" ref={root} data-weather-panel aria-label="天气">
      <div className="calendar-weather-summary">
        <button className="cw-summary-main" type="button" onClick={() => { setExpanded(x => !x); setEditing(false); }} aria-expanded={expanded} aria-label="查看天气详情">
          <WeatherGlyph code={code} size={36} night={current?.is_day === 0} />
          <strong className="cw-current-temp">{current ? `${number(current.temperature_2m)}°` : '—°'}</strong>
          <span className="cw-condition">{busy && !current ? '加载中' : condition}</span>
          <span className="cw-collapse-arrow">{expanded ? <UpOutlined /> : <DownOutlined />}</span>
        </button>
        <button className="cw-place" type="button" onClick={switchPlace} disabled={!config || config.settings.locations.length < 2} aria-label="切换公司和宿舍天气" title={place?.description || '切换天气地点'}>
          <EnvironmentOutlined /><span>{place?.name ?? '上海'}</span>{(config?.settings.locations.length ?? 0) > 1 && <span className="cw-switch">⇄</span>}
        </button>
        <button className="cw-rain-summary" type="button" onClick={() => { setExpanded(x => !x); setEditing(false); }} aria-expanded={expanded}>
          <span className="cw-rain-drop">☂</span>
          <span>{stale ? '上次预报 · ' : ''}{summary}</span>
          <span className="cw-more">详情</span>
        </button>
      </div>

      {expanded && <div className="calendar-weather-popover" role="dialog" aria-label={editing ? '天气设置' : '天气详情'}>
        {editing && draft ? (
          <form className="cw-settings" onSubmit={submit}>
            <div className="cw-pop-heading">
              <strong>天气设置</strong>
              <button type="button" onClick={() => setEditing(false)}>返回</button>
            </div>
            <p className="cw-caption">两个固定地点 · 位置为参考坐标</p>
            {draft.locations.map((l, i) => (
              <div className="cw-setting-row" key={i}>
                <label>地点<input required maxLength={16} value={l.name} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v,n) => n === i ? { ...v,name:e.target.value } : v) })}/></label>
                <label>经度<input required type="number" step="any" min="-180" max="180" value={l.longitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v,n) => n === i ? { ...v,longitude:e.target.valueAsNumber } : v) })}/></label>
                <label>纬度<input required type="number" step="any" min="-90" max="90" value={l.latitude} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v,n) => n === i ? { ...v,latitude:e.target.valueAsNumber } : v) })}/></label>
              </div>
            ))}
            <div className="cw-caption">分钟级短时降雨需要和风天气凭证；基础天气无需账号。</div>
            <label className="cw-setting-wide">和风 API Host<input placeholder="xxx.qweatherapi.com" value={draft.host} onChange={e => setDraft({...draft,host:e.target.value})}/></label>
            <label className="cw-setting-wide">API Key<input type="password" autoComplete="new-password" placeholder={config?.hasKey ? '已保存，留空保持不变' : '可选'} value={apiKey} onChange={e => setApiKey(e.target.value)}/></label>
            <button className="cw-save" type="submit" disabled={busy}>保存并刷新</button>
          </form>
        ) : (
          <>
            <div className="cw-pop-heading">
              <div><strong>未来天气</strong><span className="cw-location-label"> · {place?.name}</span></div>
              <div className="cw-pop-actions">
                <button type="button" title="天气设置" aria-label="天气设置" onClick={openSettings}><SettingOutlined /></button>
                <button type="button" title="关闭天气详情" aria-label="关闭天气详情" onClick={() => setExpanded(false)}><CloseOutlined /></button>
              </div>
            </div>
            <div className="cw-rain-notice">
              <span className="cw-rain-icon">☂</span>
              <span>{summary}</span>
            </div>
            <div className="cw-hourly-caption">接下来几小时 <span>降雨概率</span></div>
            <div className="cw-hourly-list">
              {hours.length ? hours.map(h => (
                <div className="cw-hour" key={h.time}>
                  <span className="cw-hour-time">{timeLabel(h.time)}</span>
                  <WeatherGlyph code={h.code} size={28} />
                  <strong>{number(h.temp, '°')}</strong>
                  <span className="cw-hour-rain">☂ {number(h.probability, '%')}</span>
                </div>
              )) : <p className="cw-empty">天气暂不可用，请检查网络并重试</p>}
            </div>
            <div className="cw-footnote">
              <span>{nowcast ? '分钟级降雨 · 和风天气' : '逐小时预报 · Open-Meteo'} · {ageLabel(data?.forecastFetchedAt ?? 0, clock)}</span>
              <button type="button" disabled={busy || !config} onClick={() => { if (config) void retrieve(config.settings, true); }} title="刷新天气"><ReloadOutlined /> 刷新</button>
            </div>
            {!nowcast && <div className="cw-provider-note">分钟级雷达临近降雨需要连接和风天气。</div>}
          </>
        )}
        {error && <p className="cw-error">{error}</p>}
      </div>}
    </section>
  );
}
