import test from 'node:test';
import assert from 'node:assert/strict';
import {currentRain} from '../src/weather/currentRain.ts';
const now=Date.parse('2026-10-29T17:37:00+08:00');
const make=()=>({forecast:{current:{weather_code:104}},minutelyFetchedAt:now/1000,minutely:{updateTime:'2026-10-29T17:30:00+08:00',minutely:[{fxTime:'2026-10-29T17:35:00+08:00',precip:'0.15',type:'rain'}]}});
test('fresh local nowcast brings rain to the hero without inventing intensity',()=>{const r=currentRain(make(),now);assert.equal(r.active,true);assert.equal(r.code,399);assert.equal(r.conflict,true);assert.match(r.source,/17:30/);});
test('future rain, a dry current point and invalid amounts do not become current rain',()=>{
 for(const p of [{fxTime:'2026-10-29T18:00:00+08:00',precip:'1',type:'rain'},{fxTime:'2026-10-29T17:35:00+08:00',precip:'0',type:'rain'},{fxTime:'2026-10-29T17:35:00+08:00',precip:'',type:'rain'},{fxTime:'2026-10-29T17:35:00+08:00',precip:'1',type:'snow'}]){const d=make();d.minutely.minutely=[p];assert.equal(currentRain(d,now).active,false);}
});
test('stale, failed and future-dated responses never drive live rain',()=>{for(const change of [d=>d.rainError='offline',d=>d.minutelyFetchedAt-=1200,d=>d.minutely.updateTime='2026-10-29T16:00:00+08:00',d=>d.minutelyFetchedAt+=600]){const d=make();change(d);assert.equal(currentRain(d,now).active,false);}});
test('current thunder and snow stay intact; a newer dry point stops a nowcast override',()=>{for(const code of [302,400]){const d=make();d.forecast.current.weather_code=code;assert.equal(currentRain(d,now).code,code);}const d=make();assert.equal(currentRain(d,now+5*60000).active,false);d.minutely.minutely.push({fxTime:'2026-10-29T17:36:00+08:00',precip:'0',type:'rain'});assert.equal(currentRain(d,now).active,false);});
