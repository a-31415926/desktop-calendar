import { EnvironmentOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import {
  ageLabel, number, timeLabel, weatherCode,
  type Settings, type SettingsResponse, type WeatherData,
} from '../../../weather/model.ts';
import { localAir, extraIsFresh, chineseAirBand } from '../../../weather/extras.ts';
import {weatherAttention,weatherDataIssues} from '../../../weather/calendarWeather.ts';
import {selectedForecast} from '../../../weather/selectedForecast.ts';
import {panelDetails} from '../../../weather/panelDetails.ts';
import {dayWeatherFacts} from '../../../weather/dayWeatherFacts.ts';
import CalendarWeatherHero from './CalendarWeatherHero.tsx';
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

export default function CalendarWeather({ selectedDate, children, onData, onReturnToday }: { selectedDate: Dayjs; children: ReactNode; onData?:(data:WeatherData|null)=>void; onReturnToday?:()=>void }) {
  const root = useRef<HTMLElement | null>(null);
  const forecastStrip=useRef<HTMLDivElement|null>(null);
  const currentSettings = useRef<Settings | null>(null);
  const lastRequest = useRef(0);
  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  useEffect(()=>{onData?.(data);},[data,onData]);
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [clearKey, setClearKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

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
      if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();setEditing(false);}
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
      const result = await call<SettingsResponse>('weather_save_settings', { settings, apiKey: key ?? null });
      currentSettings.current = result.settings;
      setConfig(result);
      setDraft(result.settings);
      setApiKey(''); setClearKey(false);
      setEditing(false);
      setData(null);
      await retrieve(result.settings, true);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  };
  const openSettings = () => {
    if (!config) return;
    setDraft(structuredClone(config.settings));
    setApiKey('');
    setClearKey(false);
    setError('');
    setEditing(true);
  };
  useEffect(() => {
    const open = () => openSettings();
    window.addEventListener('calendar-open-weather-settings', open);
    return () => window.removeEventListener('calendar-open-weather-settings', open);
  }, [config]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft) void save(draft, clearKey ? '' : apiKey.trim() || undefined);
  };

  const selected=selectedForecast(data,selectedDate.format('YYYY-MM-DD'),clock);
  const hours=selected.hours;
  const details=panelDetails(data,selectedDate.format('YYYY-MM-DD'),clock);
  const facts=dayWeatherFacts(data,selectedDate.format('YYYY-MM-DD'),clock);
  const stale = !!data?.forecast && (!!data.forecastError || clock - data.forecastFetchedAt * 1000 > 45 * 60000);
  const provider = data?.provider ?? config?.settings.provider ?? 'qweather';
  const source = provider === 'qweather' ? '和风天气' : 'Open-Meteo · CC BY 4.0';
  const attention=weatherAttention(data,clock);
  const dataIssues=weatherDataIssues(data,clock);
  const issue = error || data?.forecastError || data?.saveError;

  return (
    <section className="calendar-weather cw-unified" ref={root} data-weather-card data-weather-panel aria-label="公司、宿舍和老家天气">
      <CalendarWeatherHero selectedDate={selectedDate} data={data} clock={clock} error={issue || ''} stale={stale} actions={
        <div className="cw-actions">
          <label className="cw-place-picker"><EnvironmentOutlined/><select aria-label="天气地点" value={config?.settings.selected??0} disabled={!config||busy} onChange={event=>{if(config){setData(null);void save({...config.settings,selected:Number(event.target.value)});}}}>
            {config?config.settings.locations.map((place,index)=><option key={index} value={index}>{place.name}</option>):<option>地点</option>}
          </select></label>
        </div>
      }>{children}</CalendarWeatherHero>
      <div className="cw-glance">
        {attention && (
          <div className={'cw-glance-alert cw-glance-alert-'+attention.kind} role="status">
            <span className="cw-glance-alert-mark">{attention.kind==='official'?'⚠':'●'}</span>
            <span>{attention.kind==='official'?'当前官方预警 · ':!selected.isToday?'今日提醒 · ':''}{attention.title}</span>
          </div>
        )}
        {dataIssues.length>0 && (
          <div className="cw-glance-status" role="status">数据状态 · {dataIssues[0]}</div>
        )}
        {provider==='qweather' && (() => {
          const air=localAir(data?.extras?.air);
          const fresh=extraIsFresh(data?.extras?.air,clock,60*60000);
          const band=chineseAirBand(air);
          return <div className={'cw-glance-air'+(!fresh?' is-stale':'')} data-aqi-risk={band.risk}>
            <span className="cw-glance-label">当前空气质量{air?.primaryPollutant?.name&&air.aqi!=null&&air.aqi>100?` · 首污 ${air.primaryPollutant.name}`:""}</span>
            <strong>{air ? `AQI ${number(air.aqi)} · ${band.label}` : '数据暂缺'}</strong>
            <span className="cw-air-particles">{details.pollutants}</span>

            {air && !fresh && <span className="cw-glance-stale">旧数据</span>}
          </div>;
        })()}
        {facts&&<div className={"cw-day-facts"+(facts.today?"":" cw-day-facts-future")} aria-label={`${selectedDate.format('M月D日')}天气要点`}>
          <div title={`数据来源：和风天气；强度按中国天气网五档划分。${facts.uvProtection.tip}`}><span>{facts.today?'当前紫外线':'当日最高UV'}</span><strong className="cw-uv-protection" data-uv-risk={facts.uvProtection.risk}>{facts.uv!=null?`${facts.uvProtection.strength} · 指数${number(facts.uv)}`:facts.uvProtection.label}</strong></div>
          <div><span>{facts.today?'风向风力':'最大风速'}</span><strong>{facts.today?details.wind:number(facts.wind,' km/h')}</strong></div>
          {facts.today&&<div><span>空气湿度</span><strong>{number(facts.humidity,'%')}</strong></div>}
          <p className="cw-uv-guidance">{facts.uvStale?<span>旧UV · </span>:null}{facts.today&&facts.uvMax!=null&&<span className="cw-uv-maximum">今日最高 {number(facts.uvMax)}</span>}{facts.uvProtection.guidance&&<span>{facts.today&&facts.uvMax!=null?' · ':''}{facts.uvProtection.guidance}</span>}</p>
        </div>}
        {selected.isToday&&<p className="cw-rain-summary">{details.rain}</p>}
        <div className="cw-glance-forecast">
          <div className="cw-glance-heading"><span>{selected.isToday?'未来六小时':hours.length?`${selectedDate.format('M月D日')}逐小时`:'所选日期天气'}</span>{!selected.isToday&&onReturnToday?<button type="button" className="cw-return-today" onClick={onReturnToday}>回到今天</button>:<span className="cw-hour-controls">{stale?'旧预报':null}<button type="button" aria-label="前六小时" onClick={()=>forecastStrip.current?.scrollBy({left:-forecastStrip.current.clientWidth,behavior:'smooth'})}>‹</button><button type="button" aria-label="后六小时" onClick={()=>forecastStrip.current?.scrollBy({left:forecastStrip.current.clientWidth,behavior:'smooth'})}>后续 ›</button></span>}</div>
          <div className="cw-glance-hours" ref={forecastStrip} tabIndex={hours.length?0:undefined} aria-label="逐小时天气，横向滚动查看后续时段">
            {hours.map(h=>(
              <div className="cw-glance-hour" key={h.time}>
                <span>{timeLabel(h.time)}</span>
                <WeatherGlyph code={h.code} size={23}/>
                <strong>{number(h.temp,'°')}</strong>
                {h.probability!=null && <small>雨 {number(h.probability,'%')}</small>}
              </div>
            ))}
            {!hours.length && <div className="cw-selected-summary">
              {!selected.isPast&&selected.available&&<><p>最高 {number(selected.high,'°')} / 最低 {number(selected.low,'°')}</p><p>当日降雨概率 {number(selected.probability,'%')}</p></>}
              <p className="cw-glance-empty">{!data&&busy?'正在获取天气…':selected.empty}</p>
            </div>}
          </div>
        </div>
        {details.sun&&<div className="cw-sun-times"><span>日出 <strong>{details.sun.rise}</strong></span><span>日落 <strong>{details.sun.set}</strong></span></div>}
        {details.life&&<p className="cw-life-advice" title={details.life}>穿衣 · {details.life}</p>}
        <div className="cw-glance-bottom">
          <span>{source} · {ageLabel(data?.forecastFetchedAt ?? 0,clock)}</span>
          <button type="button" onClick={()=>{if(config)void retrieve(config.settings,true)}} disabled={busy||!config} aria-label="刷新天气" title="刷新天气"><ReloadOutlined/></button>
        </div>
        {issue && !data && <div className="cw-glance-status cw-glance-error" role="status">天气数据不可用</div>}
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
                <label>说明<input maxLength={80} value={l.description} onChange={e => setDraft({ ...draft, locations: draft.locations.map((v,n) => n === i ? { ...v, description: e.target.value } : v) })}/></label>
              </div>
            ))}
            {draft.locations.length < 5 && <button type="button" className="cw-add-place" onClick={() => setDraft({ ...draft, locations: [...draft.locations, { name: '其他地点', description: '可自行修改坐标', latitude: 31.23, longitude: 121.47 }] })}>＋ 添加地点</button>}
            <label>天气服务<select value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value as Settings['provider'] })}><option value="qweather">和风天气（中国服务商，默认）</option><option value="open-meteo">Open-Meteo（可选）</option></select></label>
            <p className="cw-helper">和风天气用于当前、逐小时、多日及短时降雨。请填写自己账户的 Host 和 API Key，接口权限、费用和额度以账户为准。</p>
            <label>和风 API Host<input placeholder="xxx.qweatherapi.com" value={draft.host} onChange={e => setDraft({ ...draft, host: e.target.value })}/></label>
            <label>API Key<input type="password" autoComplete="new-password"
              placeholder={config?.hasKey ? '已加密保存，留空不修改' : '填写你的真实 API Key'}
              value={apiKey} onChange={e => { setApiKey(e.target.value); setClearKey(false); }}/></label>
            {config?.hasKey && <label className="cw-clear-key"><input type="checkbox" checked={clearKey} onChange={e => setClearKey(e.target.checked)}/>清除已保存凭证</label>}
            <p className="cw-helper">凭证仅用当前 Windows 账户加密保存在本机。留空保留原凭证。API Key 自 2027 年起可能受每日调用限制。</p>
            {error && <p className="cw-error">{error}</p>}
            <button className="cw-save" type="submit" disabled={busy}>保存并刷新</button>
          </form>
        </div>
      )}
    </section>
  );
}

