import test from 'node:test';
import assert from 'node:assert/strict';
import {popupTransitions} from '../src/utils/popupTransitions.ts';
function harness(finish=async()=>true){
 const calls=[],timers=[];
 const p=popupTransitions({visible:v=>calls.push(['visible',v]),schedule:fn=>{timers.push(fn);return fn},cancel:()=>{},requestClose:async e=>calls.push(['request',e]),finishHide:async e=>{calls.push(['hide',e]);return finish(e)},afterHide:async()=>calls.push(['settings']),error:e=>{throw e}});
 return {p,calls,timers};
}
test('late exit timer cannot hide a newly reopened calendar even when cancellation loses the race',()=>{
 const {p,calls,timers}=harness();p.enter(1);p.exit(1);const expired=timers[0];p.enter(2);expired();assert.equal(calls.some(c=>c[0]==='hide'),false);assert.deepEqual(calls.at(-1),['visible',true]);
});
test('delayed native hide event from an old opening cannot blank the new surface',()=>{
 const {p,calls}=harness();p.enter(10);p.enter(11);p.exit(10);assert.deepEqual(calls,[['visible',true],['visible',true]]);
});
test('same-opening resynchronization restores the surface rather than returning early',()=>{
 const {p,calls}=harness();p.enter(4);p.enter(4);assert.deepEqual(calls,[['visible',true],['visible',true]]);
});
test('in-flight old hide result cannot launch settings after a newer opening',async()=>{
 let resolve;const {p,calls,timers}=harness(()=>new Promise(r=>resolve=r));p.enter(1);p.exit(1,'open-main');timers[0]();p.enter(2);resolve(true);await new Promise(r=>setImmediate(r));assert.equal(calls.some(c=>c[0]==='settings'),false);
});
test('duplicate close requests share one timer and normal dismissal still completes',async()=>{
 const {p,calls,timers}=harness();p.enter(1);p.exit(1);p.exit(1,'open-main');assert.equal(timers.length,1);timers[0]();await new Promise(r=>setImmediate(r));assert.deepEqual(calls.filter(c=>c[0]==='hide'),[['hide',1]]);assert.equal(calls.filter(c=>c[0]==='settings').length,1);
});
test('100 rapid reopen cycles reject every expired timer',()=>{
 const {p,calls,timers}=harness();for(let i=1;i<=100;i++){p.enter(i);p.exit(i);}p.enter(101);timers.forEach(fn=>fn());assert.equal(calls.some(c=>c[0]==='hide'),false);
});
test('an immediate native close acknowledgement cannot recursively schedule closing',()=>{
 let requests=0,timers=0,p;
 p=popupTransitions({visible:()=>{},schedule:()=>++timers,cancel:()=>{},requestClose:async e=>{requests++;assert.ok(requests<3);p.exit(e)},finishHide:async()=>true,afterHide:async()=>{},error:e=>{throw e}});
 p.enter(1);p.exit(1);assert.equal(requests,1);assert.equal(timers,1);
});

