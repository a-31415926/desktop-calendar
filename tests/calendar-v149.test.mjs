import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {calendarDayWeather,weatherAttention,weatherDataIssues} from '../src/weather/calendarWeather.ts';
const now=Date.parse('2026-10-20T11:00:00+08:00');
const entry=value=>({value,fetchedAt:now/1000,error:null});
const data=()=>({provider:'qweather',forecastFetchedAt:now/1000,forecastError:null,rainError:null,forecast:{current:{temperature_2m:25,weather_code:100},daily:{time:['2026-10-20','2026-10-21'],weather_code:[100,306],temperature_2m_max:[27,24],temperature_2m_min:[18,16],precipitation_probability_max:[0,80]},hourly:{time:['2026-10-20T12:00+08:00'],temperature_2m:[26],weather_code:[100],precipitation_probability:[0],precipitation:[0]}},extras:{air:entry({indexes:[{code:'cn-mee',aqi:60,category:'良'}]}),alerts:entry({metadata:{zeroResult:true}}),indices:entry({daily:[]})}});
test('calendar weather never leaks to past, unforecast, stale or missing dates',()=>{
 const d=data();assert.equal(calendarDayWeather(d,'2026-10-19',now),null);assert.equal(calendarDayWeather(d,'2026-10-25',now),null);
 assert.equal(calendarDayWeather(d,'2026-10-21',now).code,306);
 d.forecastFetchedAt-=3600;assert.equal(calendarDayWeather(d,'2026-10-21',now),null);
 d.forecastFetchedAt=now/1000;d.forecast.daily.temperature_2m_min[1]=null;assert.equal(calendarDayWeather(d,'2026-10-21',now),null);
});
test('official active alerts outrank air, rain and temperature without treating zero-result as safe',()=>{
 const d=data();assert.equal(weatherAttention(d,now),null);assert.deepEqual(weatherDataIssues(d,now),[]);
 d.extras.air.value.indexes[0].aqi=120;assert.equal(weatherAttention(d,now).kind,'attention');
 d.extras.alerts.value={alerts:[{id:'1',headline:'暴雨黄色预警',expireTime:'2026-10-20T14:00+08:00'},{id:'2',headline:'暴雨红色预警',expireTime:'2026-10-20T14:00+08:00'}]};
 assert.equal(weatherAttention(d,now).title,'暴雨红色预警');
 d.extras.alerts.error='403';assert.equal(weatherAttention(d,now).kind,'attention');assert.ok(weatherDataIssues(d,now).some(s=>s.includes('预警获取失败')));
 d.extras.air.error='timeout';assert.equal(weatherAttention(d,now),null);
});
test('rain attention uses actual future hourly probability, not a rain icon or missing value',()=>{
 const d=data();d.forecast.hourly.weather_code=[307];assert.equal(weatherAttention(d,now),null);
 d.forecast.hourly.precipitation_probability=[null];assert.equal(weatherAttention(d,now),null);
 d.forecast.hourly.precipitation_probability=[80];assert.match(weatherAttention(d,now).title,/12:00.*80%/);
 d.forecast.hourly.time=['2026-10-20T09:00+08:00'];assert.equal(weatherAttention(d,now),null);
 d.forecast.daily.temperature_2m_max[0]=35;assert.match(weatherAttention(d,now).title,/35°/);
});
test('missing measurements and stale services remain data issues, never healthy zero',()=>{
 const d=data();d.forecast.current.temperature_2m=null;d.extras.air.value={indexes:[]};assert.ok(weatherDataIssues(d,now).some(s=>s.includes('温度暂缺')));assert.ok(weatherDataIssues(d,now).some(s=>s.includes('空气质量暂缺')));
 assert.equal(weatherAttention(d,now),null);d.forecastError='offline';assert.ok(weatherDataIssues(d,now).some(s=>s.includes('获取失败')));
});
const source=stripTypeScriptTypes(readFileSync(new URL('../src/utils/tauriUtils.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function api(window,hide,invoke){return vm.runInNewContext(source+'\n;({closeOrHideCalendarWindow,openMainApplicationWindow})',{window,CustomEvent,URLSearchParams,URL,Event,console,isMobile:false,invoke,getCurrentWindow:()=>({hide,close:()=>{throw Error('must not quit')}})});}
test('popup dismissal starts immediately even if backend commands never resolve',async()=>{
 const window=new EventTarget();let animated=0,hidden=0;window.location={search:'?window=popup'};
 window.addEventListener('li-calendar:popup-hide-request',e=>{e.detail.handled=true;animated++});
 const a=api(window,async()=>hidden++,()=>new Promise(()=>{}));
 await Promise.race([a.closeOrHideCalendarWindow('popup'),new Promise((_,reject)=>setTimeout(()=>reject(Error('blocked by backend')),100))]);assert.equal(animated,1);assert.equal(hidden,0);
});
test('missing popup animation listener still hides window without closing the process',async()=>{
 const window=new EventTarget();let hidden=0;const a=api(window,async()=>hidden++,async()=>{});await a.closeOrHideCalendarWindow('popup');assert.equal(hidden,1);
});
