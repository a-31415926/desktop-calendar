import test from 'node:test';
import assert from 'node:assert/strict';
import {chineseAirBand} from '../src/weather/extras.ts';
import {uvProtection} from '../src/weather/dayWeatherFacts.ts';
test('Chinese AQI colors respect every boundary and do not classify missing or foreign data',()=>{
 const band=n=>chineseAirBand({code:'cn-mee',aqi:n,category:'provider'}).risk;
 assert.deepEqual([0,50,51,100,101,150,151,200,201,300,301].map(band),['good','good','fair','fair','light','light','moderate','moderate','heavy','heavy','severe']);
 for(const n of [null,-1,NaN,Infinity])assert.equal(band(n),'unknown');
 assert.equal(chineseAirBand(null).risk,'unknown');assert.equal(chineseAirBand({code:'us-epa',aqi:55,category:'Moderate'}).risk,'unknown');
});
test('UV strengths and visible advice distinguish all five exposure bands',()=>{
 const values=[1,4,6,9,12];const results=values.map(uvProtection);
 assert.deepEqual(results.map(r=>r.strength),['低','中等','高','很高','极高']);
 assert.equal(new Set(results.map(r=>r.tip)).size,5);assert.equal(uvProtection(null).strength,'未知');
});
