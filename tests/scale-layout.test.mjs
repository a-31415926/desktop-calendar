import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarLimits,popupPosition,wholeCalendarScale} from '../src/hooks/calender/calendarBounds.ts';
import {weatherCode,precipitationMotion} from '../src/weather/model.ts';
test('all three complete-canvas scales differ and remain within scaled monitor work areas',()=>{
 for(const dpi of [1,1.25,1.5,2])for(const dims of [{width:1920,height:1032},{width:1366,height:720}]){
  const limits=calendarLimits(dims,dpi);const factors=['compact','standard','large'].map(size=>wholeCalendarScale(size,limits));
  assert.ok(factors[0]<factors[1]&&factors[1]<factors[2]);
  for(const factor of factors){assert.ok(776*factor<=limits.width+0.01);assert.ok(596*factor<=limits.height+0.01);}
 }
});
test('frontend reposition stays flush with taskbar even after size or DPI changes',()=>{
 for(const dpi of [1,1.25,1.5,2])for(const y of [0,-400]){
  const area={position:{x:-1920,y},size:{width:1920,height:1032}};
  for(const factor of [.82,.91,1]){const size={width:Math.round(776*factor),height:Math.round(596*factor)};const p=popupPosition(area,size,dpi);assert.equal(p.y+size.height,y+1032);assert.equal(p.x+size.width,area.position.x+area.size.width);}
 }
});
test('ordinary cloud conditions have no sun and light rain/showers are quicker and more visible',()=>{
 for(const code of [1,2,101,102,151,152])assert.equal(weatherCode(code)[1],'cloud');
 assert.equal(weatherCode(103)[1],'cloud-sun');
 const rain=precipitationMotion(305),shower=precipitationMotion(300);assert.ok(rain.count>=16&&rain.seconds<=1.1);assert.ok(shower.count>rain.count&&shower.seconds<rain.seconds);
 assert.equal(precipitationMotion(300,false).count,0);
});
