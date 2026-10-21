import test from 'node:test';
import assert from 'node:assert/strict';
import {dayWeatherFacts,uvCategory} from '../src/weather/dayWeatherFacts.ts';
import {selectedHours} from '../src/weather/model.ts';
const now=Date.parse('2026-10-20T09:00+08:00');
const d=()=>({forecastFetchedAt:now/1000,forecastError:null,forecast:{current:{uv_index:1,wind_speed_10m:8,relative_humidity_2m:70},daily:{time:['2026-10-20','2026-10-21'],uv_index_max:[4,10],wind_speed_10m_max:[12,18]}},extras:{indices:{value:{daily:[{date:'2026-10-20',type:'5',category:'弱'}]},fetchedAt:now/1000,error:null}}});
test('today uses current UV 1 even when daily max is 4; future still uses matching daily maximum',()=>{
 const f=dayWeatherFacts(d(),'2026-10-20',now);assert.equal(f.uv,1);assert.equal(f.uvMax,4);assert.equal(f.uvProtection.strength,'最弱');assert.equal(f.wind,8);assert.equal(f.humidity,70);assert.equal(f.uvStale,false);
 const future=dayWeatherFacts(d(),'2026-10-21',now);assert.equal(future.uv,10);assert.equal(future.uvCategory,'很强');assert.equal(future.wind,18);assert.equal(future.humidity,null);
});
test('zero current UV is valid; missing, negative and non-finite current UV never fall back to daily maximum',()=>{
 const v=d();v.forecast.current.uv_index=0;v.forecast.current.wind_speed_10m=0;v.forecast.current.relative_humidity_2m=0;
 const f=dayWeatherFacts(v,'2026-10-20',now);assert.equal(f.uv,0);assert.equal(f.uvCategory,'最弱');assert.equal(f.wind,0);assert.equal(f.humidity,0);
 for(const uv of [null,undefined,-1,NaN,Infinity]){v.forecast.current.uv_index=uv;const f=dayWeatherFacts(v,'2026-10-20',now);assert.equal(f.uv,null);assert.equal(f.uvMax,4);assert.equal(f.uvProtection.risk,'unknown');assert.equal(f.uvCategory,null);}
 assert.equal(dayWeatherFacts(v,'2026-10-19',now),null);assert.equal(dayWeatherFacts(v,'2026-11-01',now),null);
});
test('old current UV is labeled cached and daily life-index category never replaces current UV strength',()=>{
 const v=d();v.forecastError='offline';assert.equal(dayWeatherFacts(v,'2026-10-20',now).uvStale,true);
 v.forecastError=null;v.forecastFetchedAt-=3600;assert.equal(dayWeatherFacts(v,'2026-10-20',now).uvStale,true);
 assert.deepEqual([0,2,3,4,5,6,7,9,10].map(uvCategory),['最弱','最弱','弱','弱','中等','中等','强','强','很强']);
});
test('hourly UV matches each forecast timestamp, preserving zero and missing values',()=>{
 const f={hourly:{time:['2026-10-20T09:00+08:00','2026-10-20T10:00+08:00','2026-10-20T11:00+08:00'],temperature_2m:[20,21,22],weather_code:[100,100,100],precipitation_probability:[0,0,0],precipitation:[0,0,0],uv_index:[0,2,null]}};
 assert.deepEqual(selectedHours(f,'2026-10-20',now).map(h=>h.uv),[0,2,null]);
});

test('daily UV maximum is shown exactly when different or current index is missing',()=>{
 const v=d();
 for(const [current,maximum,shown] of [[4,4,false],[3,4,true],[0,0,false],[null,4,true],[4,null,false],[3.6,4,true]]){
  v.forecast.current.uv_index=current;v.forecast.daily.uv_index_max[0]=maximum;
  assert.equal(dayWeatherFacts(v,'2026-10-20',now).showUvMax,shown);
 }
 assert.equal(dayWeatherFacts(d(),'2026-10-21',now).showUvMax,false);
});
