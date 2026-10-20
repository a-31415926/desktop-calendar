import {useState} from 'react';
import {ageLabel, dateKey, number, type WeatherData} from '../../../weather/model.ts';
import {activeAlerts, extraIsFresh, localAir, type ExtraEntry} from '../../../weather/extras.ts';

function Status({entry,now,ttl}:{entry:ExtraEntry<unknown>|undefined;now:number;ttl:number}) {
  return <small>{entry?.value ? (extraIsFresh(entry,now,ttl)?'':'缓存 · ')+ageLabel(entry.fetchedAt,now) : entry?.error?'暂不可用':'尚未获取'}</small>;
}
export default function CalendarWeatherExtras({data,clock}:{data:WeatherData|null;clock:number}) {
  const [open,setOpen]=useState(false);
  const extras=data?.extras, air=localAir(extras?.air), alerts=activeAlerts(extras?.alerts,clock);
  const indices=(extras?.indices.value?.daily??[]).filter(i=>i.date===dateKey(clock));
  const warningFresh=extraIsFresh(extras?.alerts,clock,20*60000);
  return <div data-no-month-scroll>
    {alerts.length>0 && <div className="cw-warning" role="status">{alerts.map(a=><details key={a.id}><summary>⚠ 当前预警 · {a.headline}</summary><p>{a.description}</p>{a.instruction&&<p>{a.instruction}</p>}<small>{a.senderName} · 以气象部门最新发布为准</small></details>)}</div>}
    <button className="cw-life-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span>{air?`${air.code==='cn-mee'?'中国 AQI':air.name} ${number(air.aqi)} · ${air.category}${extraIsFresh(extras?.air,clock,60*60000)?'':'（缓存）'}`:'空气质量与生活指数'}</span><span>{open?'收起详情 ▴':'详情 ▾'}</span></button>
    {open&&<div className="cw-life-panel">
      <p><b>当前空气质量</b> · <Status entry={extras?.air} now={clock} ttl={60*60000}/></p>
      {air?<p>{air.name} {number(air.aqi)} · {air.category}{air.primaryPollutant?.name?' · 首要污染物 '+air.primaryPollutant.name:''}</p>:null}
      {(extras?.air.value?.pollutants??[]).filter(p=>['pm2p5','pm10'].includes(p.code)).map(p=><p key={p.code}>{p.name} {number(p.concentration.value)} {p.concentration.unit}</p>)}
      {extras?.air.error&&<p className="cw-error">空气质量：{extras.air.error}</p>}
      <p><b>当前位置预警</b> · <Status entry={extras?.alerts} now={clock} ttl={20*60000}/></p>
      <p>{warningFresh?alerts.length?`${alerts.length} 条生效预警`:'接口当前未返回生效预警':'预警暂不可用，不能确认当前是否有预警'}</p>
      {extras?.alerts.error&&<p className="cw-error">{extras.alerts.error}</p>}
      <small>预警信息可能延迟，以气象部门最新发布为准。</small>
      <p><b>今日生活指数</b> · <Status entry={extras?.indices} now={clock} ttl={12*3600000}/></p>
      {indices.map(i=><details key={i.type}><summary>{i.name} · {i.category}</summary><p>{i.text}</p></details>)}
      {!indices.length&&<p>今日生活指数暂无数据</p>}
      {extras?.indices.error&&<p className="cw-error">生活指数：{extras.indices.error}</p>}
      {[...new Set([...(extras?.air.value?.metadata?.attributions??[]),...(extras?.alerts.value?.metadata?.attributions??[])])].map(a=><small style={{display:'block',overflowWrap:'anywhere'}} key={a}>{a}</small>)}
    </div>}
  </div>;
}
