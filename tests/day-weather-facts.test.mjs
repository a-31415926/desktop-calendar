import test from 'node:test';
import assert from 'node:assert/strict';
import {dayWeatherFacts,uvCategory} from '../src/weather/dayWeatherFacts.ts';
const now=Date.parse('2026-10-20T15:00+08:00');
const d=()=>({forecast:{current:{wind_speed_10m:8,relative_humidity_2m:70},daily:{time:['2026-10-20','2026-10-21'],uv_index_max:[4,10],wind_speed_10m_max:[12,18]}},extras:{indices:{value:{daily:[{date:'2026-10-20',type:'5',category:'弱'}]},fetchedAt:now/1000,error:null}}});
test('today facts include provider UV category, current wind and humidity without requiring missing hourly data',()=>{
 const f=dayWeatherFacts(d(),'2026-10-20',now);assert.equal(f.uvCategory,'弱');assert.equal(f.uv,4);assert.equal(f.wind,8);assert.equal(f.humidity,70);
 const future=dayWeatherFacts(d(),'2026-10-21',now);assert.equal(future.uvCategory,'很强');assert.equal(future.wind,18);assert.equal(future.humidity,null);
});
test('zero values are valid while missing, negative UV and out-of-range dates stay unknown',()=>{
 const v=d();v.forecast.current.wind_speed_10m=0;v.forecast.current.relative_humidity_2m=0;v.forecast.daily.uv_index_max[0]=0;v.extras.indices.value.daily=[];
 const f=dayWeatherFacts(v,'2026-10-20',now);assert.equal(f.uvCategory,'最弱');assert.equal(f.wind,0);assert.equal(f.humidity,0);
 v.forecast.daily.uv_index_max[0]=-1;assert.equal(dayWeatherFacts(v,'2026-10-20',now).uv,null);assert.equal(dayWeatherFacts(v,'2026-10-20',now).uvCategory,null);
 assert.equal(dayWeatherFacts(v,'2026-10-19',now),null);assert.equal(dayWeatherFacts(v,'2026-11-01',now),null);
});
test('cached UV life index is labeled and cannot overwrite fresh numeric forecast category',()=>{
 const v=d();v.extras.indices.error='offline';v.forecast.daily.uv_index_max[0]=null;const f=dayWeatherFacts(v,'2026-10-20',now);assert.equal(f.uvCategory,'弱');assert.equal(f.uvCached,true);
 v.forecast.daily.uv_index_max[0]=8;assert.equal(dayWeatherFacts(v,'2026-10-20',now).uvCategory,'强');
 assert.deepEqual([0,2,3,4,5,6,7,9,10].map(uvCategory),['最弱','最弱','弱','弱','中等','中等','强','强','很强']);
});
