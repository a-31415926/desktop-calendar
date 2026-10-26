import test from 'node:test';
import assert from 'node:assert/strict';
import {windFacts,windLevel} from '../src/weather/windFacts.ts';
test('wind levels use standard m/s boundaries after km/h conversion and retain levels above 12',()=>{
 const bounds=[0,.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7,37,41.5,46.2,51,56.1];
 bounds.forEach((value,level)=>assert.equal(windLevel(value*3.6),level));
 assert.equal(windLevel(8),2);assert.equal(windLevel(25),4);assert.equal(windLevel(220),17);
 for(const value of [null,undefined,-1,NaN,Infinity])assert.equal(windLevel(value),null);
});
test('real current scale wins, future max derives from matching speed without inventing direction',()=>{
 const current=windFacts(8,2,0);assert.equal(current.direction,'北风');assert.equal(current.level,2);assert.match(current.observation,/树叶微动/);
 assert.equal(windFacts(25).level,4);assert.equal(windFacts(25).direction,null);
 assert.equal(windFacts(0,0,90).level,0);assert.equal(windFacts(null).risk,'unknown');
 assert.equal(windFacts(40).risk,'attention');assert.equal(windFacts(65).risk,'high');
});
