import test from 'node:test';
import assert from 'node:assert/strict';
import {panelDetails} from '../src/weather/panelDetails.ts';
import {probabilityLabel} from '../src/weather/model.ts';
import {selectedForecast} from '../src/weather/selectedForecast.ts';
const day='2026-10-21',now=Date.parse(day+'T10:00+08:00');
const entry=value=>({value,fetchedAt:now/1000,error:null});
function fixture(){return {forecastFetchedAt:now/1000,forecastError:null,forecast:{current:{wind_direction:45,wind_scale:2,wind_speed_10m:8,weather_code:104},daily:{temperature_2m_max:[25],temperature_2m_min:[18],precipitation_probability_max:[0],time:[day],sunrise:[day+'T06:00+08:00'],sunset:[day+'T17:20+08:00']},hourly:{time:Array.from({length:24},(_,i)=>new Date(now+i*3600000).toISOString()),temperature_2m:Array(24).fill(20),weather_code:Array(24).fill(104),precipitation_probability:Array(24).fill(0),precipitation:Array(24).fill(0)}},extras:{air:entry({pollutants:[{code:'pm2p5',concentration:{value:0,unit:'μg/m³'}},{code:'pm10',concentration:{value:20,unit:'μg/m³'}}]}),indices:entry({daily:[{date:day,type:'3',text:'建议薄外套'}]})}};}
test('first-screen facts retain pollutant zero and units, wind, solar times and date-matched advice',()=>{
 const d=fixture(),p=panelDetails(d,day,now);
 assert.equal(p.pollutants,'PM2.5 0 μg/m³ · PM10 20 μg/m³');assert.equal(p.wind,'东北风 2级');assert.deepEqual(p.sun,{rise:'06:00',set:'17:20'});
assert.equal(panelDetails(d,'2026-10-20',now).sun,null);
 assert.match(panelDetails(null,day,now).pollutants,/暂缺/);
});
test('short-term rain never turns missing, stale or malformed measurements into dry weather',()=>{
 const d=fixture();assert.match(panelDetails(d,day,now).rain,/暂无可靠数据/);
 d.minutelyFetchedAt=now/1000;d.minutely={updateTime:new Date(now).toISOString(),minutely:[{fxTime:new Date(now+300000).toISOString(),precip:'0'}]};
 assert.match(panelDetails(d,day,now).rain,/预计无降水/);
 d.minutely.minutely[0].precip='';assert.match(panelDetails(d,day,now).rain,/数据不完整/);
 d.minutely.minutely[0].precip='1';assert.match(panelDetails(d,day,now).rain,/附近可能有降水/);
 d.rainError='失败';assert.match(panelDetails(d,day,now).rain,/暂无可靠数据/);
});
test('subsequent hourly data remains available beyond the six first-screen slots',()=>{
 const d=fixture();const p=selectedForecast(d,day,now);assert.equal(p.hours.length,24);assert.equal(p.hours[23].temp,20);assert.equal(selectedForecast(d,'2026-10-20',now).hours.length,0);
});

test('small hourly rain chances remain nonzero and malformed probabilities stay unknown',()=>{
 assert.equal(probabilityLabel(0),'0%');assert.equal(probabilityLabel(0.4),'<1%');assert.equal(probabilityLabel(65),'65%');
 for(const v of [null,undefined,-1,101,NaN])assert.equal(probabilityLabel(v),'—');
});
test('short-term rain uses absolute timestamps instead of a cached relative summary and flags genuine source differences',()=>{
 const d=fixture();d.minutelyFetchedAt=now/1000;d.minutely={updateTime:new Date(now-5*60000).toISOString(),summary:'85分钟后开始下小雨',minutely:[{fxTime:day+'T11:00+08:00',precip:'0.1'}]};
 const p=panelDetails(d,day,now);
 assert.match(p.rain,/预计 11:00 起有降水/);assert.doesNotMatch(p.rain,/85分钟/);assert.match(p.rainNote,/与小时预报有差异/);
 d.forecast.hourly.precipitation_probability.fill(40);assert.doesNotMatch(panelDetails(d,day,now).rainNote,/有差异/);
 d.forecast.hourly.precipitation_probability.fill(null);assert.doesNotMatch(panelDetails(d,day,now).rainNote,/有差异/);
});
