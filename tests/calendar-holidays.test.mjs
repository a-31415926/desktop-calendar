import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { useHolidayCountdown } from '../src/hooks/calender/useHolidayCountdown.ts';
import { getCalendarCellViewModel } from '../src/utils/calendar/calendarCellModel.ts';
import { getCalendarHoliday, isHolidaySchedulePending } from '../src/utils/calendar/calendarHolidays.ts';
import { buildMonthCells } from '../src/utils/calendar/calendarMonthUtils.ts';

const expectedDays = {
  元旦: ['01-01'],
  春节: ['02-05', '02-06', '02-07', '02-08'],
  清明节: ['04-05'],
  劳动节: ['05-01', '05-02'],
  端午节: ['06-09'],
  中秋节: ['09-15'],
  国庆节: ['10-01', '10-02', '10-03'],
};

test('only the 13 statutory dates are marked in 2027 while the annual schedule is pending', () => {
  const start = dayjs('2027-01-01');
  const marked = {};
  assert.equal(isHolidaySchedulePending(2027), true);
  assert.equal(isHolidaySchedulePending(2026), false);
  for (let offset = 0; offset < 365; offset++) {
    const date = start.add(offset, 'day');
    const holiday = getCalendarHoliday(date);
    if (holiday) {
      assert.equal(holiday.kind, 'statutory');
      (marked[holiday.name] ??= []).push(date.format('MM-DD'));
    }
  }
  assert.deepEqual(marked, expectedDays);
});

test('December grid keeps January holiday badge and distinguishes it from published rest and work days', () => {
  const december = dayjs('2026-12-01');
  const cell = (date, month = date.startOf('month')) => getCalendarCellViewModel(date, month, date, december);
  const januaryFirst = buildMonthCells(december).find((date) => date.format('YYYY-MM-DD') === '2027-01-01');
  assert.ok(januaryFirst);
  const newYear = cell(januaryFirst, december);
  assert.equal(newYear.isOtherMonth, true);
  assert.equal(newYear.badgeText, '假');
  assert.match(newYear.tooltipTitle, /元旦法定假日.*调休待公布/);
  assert.equal(cell(dayjs('2027-02-06')).displayText, '春节');
  assert.equal(cell(dayjs('2026-10-02')).badgeText, '休');
  assert.equal(cell(dayjs('2026-10-10')).badgeText, '班');
  assert.match(cell(dayjs('2026-10-10')).tooltipTitle, /国庆节调休上班/);
});

test('countdown crosses the year boundary and identifies the next date as statutory', () => {
  assert.deepEqual(useHolidayCountdown(dayjs('2026-12-31')), {
    name: '元旦',
    date: '2027年1月1日',
    days: 1,
    statutory: true,
  });
  assert.equal(useHolidayCountdown(dayjs('2026-09-30')).statutory, false);
  assert.equal(useHolidayCountdown(dayjs(0)), null);
});
