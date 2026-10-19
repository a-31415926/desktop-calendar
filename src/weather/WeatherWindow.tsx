import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ageLabel, futureRain, hourlyRows, number, rainIsFresh, timeLabel, timestamp, weatherCode, type Settings, type SettingsResponse, type WeatherData } from './model.ts';
import './weather.css';

function Icon({ kind, size = 30 }: { kind: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {(kind === 'sun' || kind === 'cloud-sun') && <g stroke="#eeb954" strokeWidth="3" strokeLinecap="round"><circle cx={kind === 'sun' ? 32 : 25} cy={kind === 'sun' ? 32 : 23} r="12" fill="#f8d789"/><path d="M32 5v5M32 54v5M5 32h5M54 32h5M12 12l4 4M48 48l4 4M12 52l4-4M48 16l4-4"/></g>}
    {kind !== 'sun' && <path d="M18 43C3 43 5 24 18 25C22 9 46 12 47 29C62 29 60 46 47 46H18" stroke="#7196b3" fill="#e2eff7" strokeWidth="2.5"/>}
    {(kind === 'rain' || kind === 'storm') && <g stroke="#518fbb" strokeWidth="3" strokeLinecap="round"><path d="M22 51l-3 7M34 51l-3 7M46 51l-3 7"/></g>}
    {kind === 'fog' && <path d="M12 52h38M18 58h27" stroke="#7196b3" strokeWidth="3" strokeLinecap="round"/>}
    {kind === 'snow' && <g fill="#7196b3"><circle cx="20" cy="54" r="2"/><circle cx="33" cy="56" r="2"/><circle cx="46" cy="53" r="2"/></g>}
  </svg>;
}
const call = <T,>(name: string, args?: Record<string, unknown>) => invoke<T>(name, args);

export default function WeatherWindow() {
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [tab, setTab] = useState(0);
  const requestId = useRef(0);
  const configRef = useRef(config);
  configRef.current = config;
  const refresh = useCallback(async (settings: Settings, force = false) => {
    const id = ++requestId.current;
    setBusy(true); setError('');
    try { const result = await call<WeatherData>('weather_fetch', { index: settings.selected, force }); if (id === requestId.current) setData(result); }
    catch (e) { if (id === requestId.current) setError(String(e)); }
    finally { if (id === requestId.current) setBusy(false); }
  }, []);
  useEffect(() => {
    let live = true;
    const reload = async () => { try { const c = await call<SettingsResponse>('weather_settings'); if (live) { setConfig(c); void refresh(c.settings); } } catch (e) { if (live) setError(String(e)); } };
    void reload();
    const timer = window.setInterval(() => { setClock(Date.now()); const c = configRef.current; if (c && !document.hidden) void refresh(c.settings); }, 60000);
    const opened = isTauri() ? listen('weather-opened', () => { setClock(Date.now()); const c = configRef.current; if (c) void refresh(c.settings); }) : Promise.resolve(() => {});
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (isTauri()) void getCurrentWindow().hide(); } };
    window.addEventListener('keydown', key);
    return () => { live = false; ++requestId.current; window.clearInterval(timer); void opened.then(fn => fn()); window.removeEventListener('keydown', key); };
  }, [refresh]);
  const save = async (settings: Settings, apiKey?: string) => {
    const result = await call<SettingsResponse>('weather_save_settings', { settings, apiKey: apiKey ?? null });
    ++requestId.current; setConfig(result); setData(null); setEditing(false); setTab(0); await refresh(result.settings, true);
  };
  const select = async (selected: number) => { if (!config) return; try { await save({ ...config.settings, selected }); } catch (e) { setError(String(e)); } };
  const place = config?.settings.locations[config.settings.selected];
  const forecast = data?.forecast ?? null;
  const current = forecast?.current;
  const weather = weatherCode(current?.weather_code ?? -1);
  const rows = hourlyRows(forecast, clock);
  const rainFresh = rainIsFresh(data, clock);
  const points = futureRain(data?.minutely ?? null, clock);
  const stale = !!data && (!!data.forecastError || clock - data.forecastFetchedAt * 1000 > 45 * 60000 || !!current && clock - timestamp(current.time) > 2 * 3600000);
  const maxRain = Math.max(0.2, ...points.map(p => Number(p.precip)));
  const rainHour = rows.find(r => r.probability != null && r.probability >= 50);
  const launch = (url: string) => { if (isTauri()) void openUrl(url).catch(() => setError('无法打开浏览器，请稍后再试')); else window.open(url, '_blank', 'noopener'); };
  return <main className="weather-app">
    <header className="weather-header"><div><span className="weather-eyebrow">桌面日历 / 天气</span><h1>出门之前</h1></div><div className="weather-tools">
      <button title={config?.settings.pinned ? '取消保留，点击外面自动收起' : '保留面板，不置顶遮挡其他窗口'} aria-label="固定天气面板" aria-pressed={config?.settings.pinned ?? false} onClick={() => { if (config) void save({ ...config.settings, pinned: !config.settings.pinned }).catch(e => setError(String(e))); }}>⌖</button>
      <button title="天气设置" aria-label="天气设置" onClick={() => setEditing(!editing)}>⚙</button>
      <button title="收起" aria-label="收起天气" onClick={() => { if (isTauri()) void getCurrentWindow().hide(); }}>×</button>
    </div></header>
    {editing && config ? <WeatherSettings config={config} save={save} cancel={() => setEditing(false)} launch={launch}/> : <>
      <div className="weather-locations" role="group" aria-label="天气地点">{config?.settings.locations.map((l, i) => <button key={`${i}-${l.name}`} aria-pressed={config.settings.selected === i} className={config.settings.selected === i ? 'selected' : ''} onClick={() => { if (i !== config.settings.selected) void select(i); }}>{l.name}<span>{i === config.settings.selected ? '当前' : '切换'}</span></button>)}</div>
      <div className="weather-place"><span>⌾ {place?.description || '正在读取地点'}</span><button aria-label="刷新天气" disabled={busy} onClick={() => { if (config) void refresh(config.settings, true); }}>{busy ? '获取中…' : '↻ 刷新'}</button></div>
      {(error || data?.saveError) && <div className="weather-error" role="alert">{error || data?.saveError}</div>}
      <section className="weather-current" aria-label="当前天气"><div><div className="weather-now-label">{stale ? '上次天气 · 已过期' : '当前天气'}<span>{current ? timeLabel(current.time) : '等待连接'}</span></div><div className="weather-temperature">{number(current?.temperature_2m)}<span>°</span></div><div className="weather-condition">{current ? weather[0] : busy ? '正在获取天气' : '暂时没有天气数据'} <span>体感 {number(current?.apparent_temperature, '°')}</span></div></div><Icon kind={weather[1]} size={100}/><div className="weather-stats"><span>湿度 <b>{number(current?.relative_humidity_2m, '%')}</b></span><span>风速 <b>{number(current?.wind_speed_10m, ' km/h')}</b></span><span>日落 <b>{forecast?.daily.sunset[0] ? timeLabel(forecast.daily.sunset[0]) : '—'}</b></span></div></section>
      {data?.forecastError && <div className="weather-error" role="status">{data.forecastError}{forecast ? '。暂时显示上次数据。' : ''}</div>}
      <section className="weather-rain"><div className="weather-section-label"><span>未来两小时</span><span className="weather-tag">{rainFresh ? '和风 · 每 5 分钟' : '短时降雨'}</span></div>
        {rainFresh ? <><h2>{data?.minutely?.summary || '降水趋势'}</h2><div className="weather-rain-chart" aria-label="未来两小时每五分钟累计降水量">{points.map(p => <div key={p.fxTime} title={`${timeLabel(p.fxTime)} · ${p.precip} 毫米 / 5分钟`} style={{ height: `${Math.max(3, Number(p.precip) / maxRain * 72)}px` }} />)}</div><div className="weather-chart-axis"><span>{points[0] ? timeLabel(points[0].fxTime) : '现在'}</span><span>每格 5 分钟累计降水 · 毫米</span><span>{points[points.length - 1] ? timeLabel(points[points.length - 1]!.fxTime) : ''}</span></div><p>最高 {maxRain > 0.2 ? maxRain.toFixed(2) : Math.max(0, ...points.map(p => Number(p.precip))).toFixed(2)} mm / 5分钟 · 预报存在误差</p></> : <><h2>{data?.qweatherConfigured ? '短时降雨暂不可用' : '更早知道，什么时候下雨'}</h2><p>{data?.rainError || (data?.qweatherConfigured ? '暂未获取有效的最新降雨预报，请稍后刷新。' : '连接和风天气后，可查看未来两小时降雨变化。基础天气已经可以独立使用。')}</p>{!data?.qweatherConfigured && <button className="weather-connect" onClick={() => setEditing(true)}>连接和风天气 <span>↗</span></button>}</>}
      </section>
      <section className="weather-hourly"><div className="weather-section-label"><h2>接下来的一天</h2><div className="weather-pager"><button aria-label="前六小时" disabled={tab === 0} onClick={() => setTab(Math.max(0, tab - 1))}>‹</button><button aria-label="后六小时" disabled={(tab + 1) * 6 >= rows.length} onClick={() => setTab(tab + 1)}>›</button></div></div><p className="weather-hour-summary">{stale ? '缓存预报，仅供参考' : rainHour ? `${timeLabel(rainHour.time)} 降水概率 ${number(rainHour.probability, '%')}，出门留意带伞` : rows.length ? '逐小时预报 · 降水概率不代表一定下雨' : '联网后显示逐小时预报'}</p><div className="weather-hour-grid">{rows.slice(tab * 6, tab * 6 + 6).map(r => <div key={r.time}><span>{timeLabel(r.time)}</span><Icon kind={weatherCode(r.code)[1]} size={30}/><b>{number(r.temp, '°')}</b><small>{number(r.probability, '%')}</small></div>)}</div></section>
      <section className="weather-days"><h2>未来三天</h2>{forecast?.daily.time.slice(0, 3).map((date, i) => <div className="weather-day" key={date}><span>{date.slice(5).replace('-', '/')}</span><Icon kind={weatherCode(forecast.daily.weather_code[i])[1]} size={25}/><span>{weatherCode(forecast.daily.weather_code[i])[0]}</span><small>{number(forecast.daily.precipitation_probability_max[i], '%')}</small><b>{number(forecast.daily.temperature_2m_min[i])}° <em>/</em> {number(forecast.daily.temperature_2m_max[i])}°</b></div>)}</section>
      <footer className="weather-footer"><span>{ageLabel(data?.forecastFetchedAt ?? 0, clock)}{stale ? ' · 缓存' : ''}</span><div><button onClick={() => launch('https://open-meteo.com/')}>Open-Meteo</button><span> · CC BY 4.0</span>{data?.qweatherConfigured && <><span> / </span><button onClick={() => launch('https://www.qweather.com/')}>和风天气</button></>}</div><p>天气 V14 · 点击外面收起，固定后保留</p></footer>
    </>}
  </main>;
}

function WeatherSettings({ config, save, cancel, launch }: { config: SettingsResponse; save: (s: Settings, key?: string) => Promise<void>; cancel: () => void; launch: (url: string) => void }) {
  const [draft, setDraft] = useState<Settings>(() => structuredClone(config.settings));
  const [key, setKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return <form className="weather-settings" onSubmit={async e => { e.preventDefault(); setSaving(true); setError(''); try { await save(draft, clearKey ? '' : key || undefined); } catch (err) { setError(String(err)); setSaving(false); } }}>
    <h2>常用地点</h2><p>基础天气无需账号。地点采用 WGS84 经纬度，附近参考点不等于楼栋的精确位置。</p>
    {draft.locations.map((l, i) => <fieldset key={i}><legend>地点 {i + 1}</legend><label>名称<input required maxLength={16} value={l.name} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, name: e.target.value } : v) })}/></label><label>位置说明<input maxLength={80} value={l.description} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, description: e.target.value } : v) })}/></label><div className="weather-coordinates">{(['longitude', 'latitude'] as const).map(field => <label key={field}>{field === 'longitude' ? '经度' : '纬度'}<input type="number" required step="any" min={field === 'longitude' ? -180 : -90} max={field === 'longitude' ? 180 : 90} value={Number.isFinite(l[field]) ? l[field] : ''} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v, n) => n === i ? { ...v, [field]: e.target.valueAsNumber } : v) })}/></label>)}</div></fieldset>)}
    {draft.locations.length < 2 && <button type="button" className="weather-secondary" onClick={() => setDraft({ ...draft, locations: [...draft.locations, { name: '地点二', description: '请设置位置', latitude: 31.23, longitude: 121.47 }] })}>＋ 添加第二个地点</button>}
    <h2>和风短时降雨 <span className="weather-optional">可选</span></h2><p>只用于未来两小时降雨。需要你自己的和风账户及分钟级接口权限，费用与额度以账户为准。</p><button type="button" className="weather-text-link" onClick={() => launch('https://console.qweather.com/')}>打开和风控制台 ↗</button>
    <label>API Host<input autoComplete="off" placeholder="例如 abc.xy.qweatherapi.com" value={draft.host} onChange={e => setDraft({ ...draft, host: e.target.value })}/></label><label>API Key<input type="password" autoComplete="new-password" value={key} onChange={e => { setKey(e.target.value); setClearKey(false); }} placeholder={config.hasKey ? '已保存在本机；留空保留原凭证' : '粘贴你的 API Key'}/></label><p>凭证使用当前 Windows 账户加密保存，不随源码或安装包上传。API Key 在 2027 年起的调用限制以和风规则为准。</p>
    {config.hasKey && <label className="weather-check"><input type="checkbox" checked={clearKey} onChange={e => setClearKey(e.target.checked)}/>清除已保存的凭证</label>}
    {error && <div className="weather-error" role="alert">{error}</div>}<div className="weather-form-actions"><button type="button" className="weather-secondary" onClick={cancel} disabled={saving}>返回</button><button className="weather-primary" disabled={saving}>{saving ? '正在保存…' : '保存并刷新'}</button></div>
    <details><summary>开源与数据来源</summary><p>天气码映射改编自 LuckyIsland（MIT，© 2026 thisxiaoyuQAQ）。基础数据来自 Open-Meteo，CC BY 4.0。短时降雨来自和风天气。完整许可随程序提供。</p></details>
  </form>;
}
