import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { useHolidayCountdown } from '../src/hooks/calender/useHolidayCountdown.ts';
import { getCalendarCellViewModel } from '../src/utils/calendar/calendarCellModel.ts';
import { getCalendarHoliday } from '../src/utils/calendar/calendarHolidays.ts';
import { buildMonthCells } from '../src/utils/calendar/calendarMonthUtils.ts';

const expectedDays = {
  元旦: ['01-01', '01-02', '01-03'],
  春节: ['02-05', '02-06', '02-07', '02-08', '02-09', '02-10', '02-11', '02-12', '02-13'],
  清明节: ['04-03', '04-04', '04-05'],
  劳动节: ['05-01', '05-02', '05-03', '05-04', '05-05'],
  端午节: ['06-09'],
  中秋节: ['09-15'],
  国庆节: ['10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07'],
};

test('2027 marks all 29 days off and five makeup workdays in the published schedule', () => {
  const start = dayjs('2027-01-01');
  const marked = {};
  const workdays = {};
  for (let offset = 0; offset < 365; offset++) {
    const date = start.add(offset, 'day');
    const holiday = getCalendarHoliday(date);
    if (holiday?.kind === 'rest') {
      (marked[holiday.name] ??= []).push(date.format('MM-DD'));
    } else if (holiday?.kind === 'work') {
      workdays[date.format('MM-DD')] = holiday.name;
    }
  }
  assert.deepEqual(marked, expectedDays);
  assert.deepEqual(workdays, {
    '01-31': '春节',
    '02-14': '春节',
    '05-08': '劳动节',
    '09-26': '国庆节',
    '10-09': '国庆节',
  });
});

test('December grid keeps January holiday badge and distinguishes it from published rest and work days', () => {
  const december = dayjs('2026-12-01');
  const cell = (date, month = date.startOf('month')) => getCalendarCellViewModel(date, month, date, december);
  const januaryFirst = buildMonthCells(december).find((date) => date.format('YYYY-MM-DD') === '2027-01-01');
  assert.ok(januaryFirst);
  const newYear = cell(januaryFirst, december);
  assert.equal(newYear.isOtherMonth, true);
  assert.equal(newYear.badgeText, '休');
  assert.match(newYear.tooltipTitle, /元旦放假/);
  assert.equal(cell(dayjs('2027-02-06')).displayText, '春节');
  assert.equal(cell(dayjs('2027-02-13')).badgeText, '休');
  assert.equal(cell(dayjs('2027-02-14')).badgeText, '班');
  assert.equal(cell(dayjs('2026-10-02')).badgeText, '休');
  assert.equal(cell(dayjs('2026-10-10')).badgeText, '班');
  assert.match(cell(dayjs('2026-10-10')).tooltipTitle, /国庆节调休上班/);
});

test('countdown crosses the year boundary and skips makeup workdays', () => {
  assert.deepEqual(useHolidayCountdown(dayjs('2026-12-31')), {
    name: '元旦',
    date: '2027年1月1日',
    days: 1,
  });
  assert.deepEqual(useHolidayCountdown(dayjs('2027-01-30')), {
    name: '春节',
    date: '2027年2月5日',
    days: 6,
  });
  assert.equal(useHolidayCountdown(dayjs(0)), null);
});
