import { dateKey, number, timeLabel, timestamp, type Forecast } from './model.ts';
export interface ExtraEntry<T> {value:T|null;fetchedAt:number;error:string|null}
export interface AirIndex {code:string;name:string;aqi:number|null;category:string;primaryPollutant?:{name?:string}}
export interface WeatherAlert {id:string;headline:string;description?:string;senderName?:string;effectiveTime?:string;expireTime?:string;instruction?:string;messageType?:{code?:string;supersedes?:string[]}}
export interface LifeIndex {date:string;type:string;name:string;category:string;text:string}
export interface WeatherExtras {
  air:ExtraEntry<{indexes:AirIndex[];pollutants?:{code:string;name:string;concentration:{value:number;unit:string}}[];metadata?:{attributions?:string[]}}>;
  alerts:ExtraEntry<{alerts?:WeatherAlert[];metadata?:{zeroResult?:boolean;attributions?:string[]}}>;
  indices:ExtraEntry<{daily:LifeIndex[]}>;
}
export function extraIsFresh(entry:ExtraEntry<unknown>|undefined,now:number,ttl:number) {
  return !!entry?.value && !entry.error && entry.fetchedAt>0 && now-entry.fetchedAt*1000 < ttl && now-entry.fetchedAt*1000 >= -60000;
}
export function localAir(entry:WeatherExtras['air']|undefined) {
  const all=entry?.value?.indexes??[];
  const item=all.find(i=>i.code==='cn-mee')??all[0];
  return item && item.aqi!=null && Number.isFinite(item.aqi) ? item : null;
}
export function activeAlerts(entry:WeatherExtras['alerts']|undefined,now:number) {
  if (!extraIsFresh(entry,now,20*60000)) return [];
  const alerts=entry?.value?.alerts??[];
  const replaced=new Set(alerts.flatMap(a=>a.messageType?.supersedes??[]));
  return alerts.filter(a=>a.messageType?.code!=='cancel' && !replaced.has(a.id)
    && (!a.expireTime || timestamp(a.expireTime)>now)
    && (!a.effectiveTime || timestamp(a.effectiveTime)<=now));
}
export function commuteSummary(f:Forecast|null,now=Date.now()):string|null {
  if(!f)return null;
  const today=dateKey(now),hour=Number(timeLabel(now/1000).slice(0,2));
  const next=hour>20, morning=hour<10||next;
  const day=next?dateKey(timestamp(today)+86400000):today;
  const start=morning?8:18,end=morning?9:20;
  const rows=f.hourly.time.map((t,i)=>({t,temp:f.hourly.temperature_2m[i],p:f.hourly.precipitation_probability[i]})).filter(h=>dateKey(timestamp(h.t))===day && timestamp(h.t)>=now-3600000 && Number(timeLabel(h.t).slice(0,2))>=start && Number(timeLabel(h.t).slice(0,2))<=end);
  if(!rows.length)return null;
  const ps=rows.map(h=>h.p).filter((p):p is number=>p!=null&&Number.isFinite(p));
  const temps=rows.map(h=>h.temp).filter((v):v is number=>v!=null&&Number.isFinite(v));
  const from=timeLabel(rows[0].t),to=timeLabel(rows[rows.length-1].t);
  return `${next?'明日':'今日'} ${from}${from!==to?'–'+to:''} · ${temps.length?number(Math.min(...temps))+'–'+number(Math.max(...temps))+'°':'温度暂无'} · ${ps.length?'降雨概率最高 '+number(Math.max(...ps),'%'):'降雨概率暂无'}`;
}

/** Chinese AQI bands only; unknown or foreign scales stay neutral. */
export function chineseAirBand(air:AirIndex|null) {
  if(!air||air.code!=='cn-mee'||air.aqi==null||!Number.isFinite(air.aqi)||air.aqi<0)return {risk:'unknown',label:air?.category??'数据暂缺'};
  const n=air.aqi;
  return n<=50?{risk:'good',label:'优'}:n<=100?{risk:'fair',label:'良'}:n<=150?{risk:'light',label:'轻度污染'}:n<=200?{risk:'moderate',label:'中度污染'}:n<=300?{risk:'heavy',label:'重度污染'}:{risk:'severe',label:'严重污染'};
}
