import test from 'node:test';
import assert from 'node:assert/strict';
import {atmosphereState} from '../src/weather/atmosphereState.ts';
import {rainMotion} from '../src/weather/rainMotion.ts';
const now=Date.parse('2026-10-20T20:00:00+08:00');
function fixture(){return {forecastFetchedAt:now/1000,forecastError:null,forecast:{current:{weather_code:305,is_day:0,wind_speed_10m:80},daily:{time:['2026-10-20','2026-10-21'],weather_code:[305,102],temperature_2m_max:[23,25],temperature_2m_min:[18,19],precipitation_probability_max:[80,10],wind_speed_10m_max:[90,10]},hourly:{time:[],weather_code:[],temperature_2m:[],precipitation_probability:[],precipitation:[]}},extras:{alerts:{fetchedAt:now/1000,error:null,value:{alerts:[]}}}};}
test('rain strength increases in density and speed for provider and WMO codes',()=>{
 const a=rainMotion(305),b=rainMotion(306),c=rainMotion(307);
 assert.ok(a.near+a.far>=30);assert.ok(a.far+a.near<b.far+b.near);assert.ok(b.far+b.near<c.far+c.near);assert.ok(a.seconds>b.seconds&&b.seconds>c.seconds);
 assert.deepEqual(rainMotion(61),a);assert.deepEqual(rainMotion(63),b);assert.deepEqual(rainMotion(65),c);
});
test('high wind alone is not a typhoon, and future dates do not borrow current wind or night',()=>{
 const d=fixture();const current=atmosphereState(d,'2026-10-20',now);assert.equal(current.wind,'wind');assert.equal(current.night,true);
 const future=atmosphereState(d,'2026-10-21',now);assert.equal(future.wind,'normal');assert.equal(future.night,false);assert.equal(future.clouds,'few');
});
test('only fresh, active official typhoon alerts drive the current typhoon treatment',()=>{
 const d=fixture();d.extras.alerts.value.alerts=[{id:'a',headline:'台风黄色预警',expireTime:'2026-10-21T00:00:00+08:00'}];
 assert.equal(atmosphereState(d,'2026-10-20',now).wind,'typhoon');assert.equal(atmosphereState(d,'2026-10-21',now).wind,'normal');
 d.extras.alerts.value.alerts[0].messageType={code:'cancel'};assert.equal(atmosphereState(d,'2026-10-20',now).wind,'wind');
 delete d.extras.alerts.value.alerts[0].messageType;d.extras.alerts.fetchedAt-=3600;assert.equal(atmosphereState(d,'2026-10-20',now).wind,'wind');
});
test('stale and out-of-range weather stays neutral with no night, dust, or wind treatment',()=>{
 const d=fixture();d.forecast.current.weather_code=507;d.forecastError='offline';
 for(const date of ['2026-10-19','2026-10-20','2026-11-01']){const s=atmosphereState(d,date,now);assert.equal(s.scene,'neutral');assert.equal(s.code,undefined);assert.equal(s.wind,'normal');assert.equal(s.night,false);assert.equal(s.variant,'normal');}
});
