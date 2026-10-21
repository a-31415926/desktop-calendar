import test from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {getCalendarCellViewModel} from '../src/utils/calendar/calendarCellModel.ts';
import {uvProtection} from '../src/weather/dayWeatherFacts.ts';
const cell=date=>getCalendarCellViewModel(dayjs(date),dayjs(date),dayjs('2026-10-20'),dayjs('2026-10-20'));
test('World Habitat Day during National Day break keeps rest badge without festival emphasis',()=>{
 const c=cell('2026-10-05');assert.match(c.tooltipTitle,/世界住房日/);assert.equal(c.badgeVariant,'rest');assert.equal(c.isFestivalHoliday,false);
 assert.equal(cell('2026-10-01').isFestivalHoliday,true);assert.equal(cell('2026-10-02').isFestivalHoliday,false);
 assert.equal(cell('2026-10-10').badgeVariant,'work');
});
test('actual public festival dates retain stronger emphasis, including Qingming without festival name',()=>{
 for(const date of ['2026-01-01','2026-02-16','2026-02-17','2026-04-05','2026-05-01','2026-06-19','2026-09-25'])assert.equal(cell(date).isFestivalHoliday,true,date);
});
test('UV strength follows Chinese numeric index bands rather than life-index level numbers',()=>{
 assert.equal(uvProtection(4).risk,'weak');assert.equal(uvProtection(4).label,'弱');
 assert.equal(uvProtection(2.9).risk,'weak');assert.equal(uvProtection(3).strength,'弱');assert.equal(uvProtection(6).risk,'moderate');
 assert.equal(uvProtection(7.9).strength,'强');assert.equal(uvProtection(8).strength,'强');assert.equal(uvProtection(11).risk,'very-high');
 for(const value of [null,undefined,NaN,-1,Infinity])assert.equal(uvProtection(value).risk,'unknown');
 assert.equal(uvProtection(0).risk,'low');
});
