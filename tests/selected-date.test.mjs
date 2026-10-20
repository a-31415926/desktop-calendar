import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedForecast} from '../src/weather/selectedForecast.ts';
const now=Date.parse('2026-10-20T15:00:00+08:00');
const data={forecastFetchedAt:now/1000,forecastError:null,forecast:{current:{weather_code:501},daily:{time:['2026-10-20','2026-10-21','2026-10-22'],weather_code:[501,100,306],temperature_2m_max:[27,24,20],temperature_2m_min:[22,18,16],precipitation_probability_max:[0,10,90]},hourly:{time:['2026-10-20T15:00+08:00','2026-10-20T16:00+08:00','2026-10-21T09:00+08:00'],weather_code:[501,501,100],temperature_2m:[26,25,22],precipitation_probability:[0,0,10],precipitation:[0,0,0]}}};
test('selecting a date changes weather scene, temperature, probability and hourly dates together',()=>{
 const today=selectedForecast(data,'2026-10-20',now);assert.equal(today.scene,'fog');assert.equal(today.high,27);
 const tomorrow=selectedForecast(data,'2026-10-21',now);assert.equal(tomorrow.scene,'sun');assert.equal(tomorrow.high,24);assert.equal(tomorrow.probability,10);assert.ok(tomorrow.hours.every(h=>h.time.startsWith('2026-10-21')));
 const rain=selectedForecast(data,'2026-10-22',now);assert.equal(rain.scene,'rain');assert.equal(rain.high,20);assert.equal(rain.probability,90);assert.deepEqual(rain.hours,[]);assert.match(rain.empty,/尚未覆盖/);
 assert.equal(selectedForecast(data,'2026-10-20',now).scene,'fog');
});
test('past and beyond-range dates never borrow current weather or claim a forecast',()=>{
 for(const day of ['2026-10-19','2026-11-01']){const view=selectedForecast(data,day,now);assert.equal(view.available,false);assert.equal(view.scene,'neutral');assert.equal(view.code,undefined);assert.deepEqual(view.hours,[]);}
 assert.match(selectedForecast(data,'2026-10-19',now).empty,/历史/);assert.match(selectedForecast(data,'2026-11-01',now).empty,/范围/);
});
test('stale forecast can stay labeled as cached but cannot drive a live weather atmosphere',()=>{
 const view=selectedForecast({...data,forecastError:'offline'},'2026-10-21',now);assert.equal(view.scene,'neutral');assert.equal(view.high,24);
});
