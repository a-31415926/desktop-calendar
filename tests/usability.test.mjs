import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {calendarLimits,popupPosition} from '../src/hooks/calender/calendarBounds.ts';
import {activeAlerts,extraIsFresh,localAir,commuteSummary} from '../src/weather/extras.ts';
const now=Date.parse('2026-10-20T16:30:00+08:00');
test('window fits taskbar-excluded work areas at 100/125/150/200 percent scale',()=>{
  for(const scale of [1,1.25,1.5,2])for(const origin of [{x:0,y:0},{x:-1920,y:-120}]){
    const area={position:origin,size:{width:1366,height:720}};
    const limits=calendarLimits(area.size,scale);
    const size={width:Math.round(Math.min(420,limits.width)*scale),height:Math.round(limits.height*scale)};
    const pos=popupPosition(area,size,scale);
    assert.ok(pos.x>=origin.x&&pos.y>=origin.y);
    assert.ok(pos.x+size.width<=origin.x+area.size.width);
    assert.ok(pos.y+size.height<=origin.y+area.size.height);
  }
});
test('Chinese AQI is selected explicitly and valid zero is retained',()=>{
  assert.equal(localAir({value:{indexes:[{code:'us-epa',aqi:30},{code:'cn-mee',aqi:0}]}}).code,'cn-mee');
  assert.equal(localAir({value:{indexes:[{code:'cn-mee',aqi:null}]}}),null);
});
test('expired, cancelled, superseded and stale warnings are not presented as active',()=>{
  const entry={fetchedAt:now/1000,error:null,value:{alerts:[
    {id:'old',headline:'old',messageType:{code:'alert'}},
    {id:'new',headline:'new',messageType:{code:'update',supersedes:['old']}},
    {id:'cancelled',messageType:{code:'cancel',supersedes:['new']}},
    {id:'expired',expireTime:'2026-10-19T12:00+08:00'},
    {id:'valid',effectiveTime:'2026-10-20T16:00+08:00',expireTime:'2026-10-20T18:00+08:00'},
    {id:'future',effectiveTime:'2026-10-21T12:00+08:00'},
  ]}};
  assert.deepEqual(activeAlerts(entry,now).map(a=>a.id),['valid']);
  assert.deepEqual(activeAlerts({...entry,error:'403'},now),[]);
  assert.deepEqual(activeAlerts({...entry,fetchedAt:now/1000-3600},now),[]);
  assert.equal(extraIsFresh({value:{metadata:{zeroResult:true}},error:null,fetchedAt:now/1000},now,1200000),true);
});
test('commute reference uses real matching hours and does not fabricate missing probabilities',()=>{
  const f={hourly:{time:['2026-10-20T17:00+08:00','2026-10-20T18:00+08:00','2026-10-20T19:00+08:00','2026-10-20T20:00+08:00'],temperature_2m:[25,24,23,22],precipitation_probability:[100,20,80,null]}};
  assert.match(commuteSummary(f,now),/18:00–20:00.*22–24°.*80%/);
  assert.equal(commuteSummary(f,Date.parse('2026-10-20T22:00+08:00')),null);
  assert.equal(commuteSummary(null,now),null);
  assert.match(commuteSummary({hourly:{...f.hourly,precipitation_probability:[null,null,null,null]}},now),/降雨概率暂无/);
});

test('V14.8 is a fixed-size two-column calendar without default scrolling', () => {
  const view = fs.readFileSync('src/components/calendar/CalendarView.tsx','utf8');
  const css = fs.readFileSync('src/components/calendar/calendarWide.css','utf8');
  const weather = fs.readFileSync('src/components/calendar/subs/CalendarWeather.tsx','utf8');
  const backend = fs.readFileSync('src-tauri/src/weather.rs','utf8');
  assert.match(view, /data-calendar-layout="wide"/);
  assert.match(view, /className="calendar-wide-header"/);
  assert.match(view, /className="calendar-wide-weather"/);
  assert.match(view, /className="calendar-wide-calendar"/);
  assert.match(css, /grid-template-columns:252px minmax\(0,1fr\)/);
  assert.match(css, /height: min\(596px/);
  assert.match(css, /grid-template-rows:31px repeat\(6,43px\)/);
  assert.match(css, /overflow:hidden/);
  assert.match(weather, /forecastChoice \?\? true/);
  assert.match(weather, /切换公司、宿舍和老家地点/);
  assert.match(backend, /老家 · 梁园/);
  assert.match(backend, /weather-v14\.before-three-places\.json/);
  assert.match(backend, /s\.locations\.len\(\) > 5/);
});
