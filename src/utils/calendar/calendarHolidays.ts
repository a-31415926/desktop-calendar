import type { Dayjs } from 'dayjs';
import { HolidayUtil } from 'lunar-typescript';

type CalendarHoliday = { name: string; kind: 'rest' | 'work' };

// 国办发明电〔2026〕10号：2027 年放假和补班日期。
// https://www.gov.cn/zhengce/content/202611/content_7085101.htm
const restPeriods2027 = [
  ['元旦', '01', 1, 3],
  ['春节', '02', 5, 13],
  ['清明节', '04', 3, 5],
  ['劳动节', '05', 1, 5],
  ['端午节', '06', 9, 9],
  ['中秋节', '09', 15, 15],
  ['国庆节', '10', 1, 7],
] as const;

const holidays2027 = new Map<string, CalendarHoliday>([
  ['01-31', { name: '春节', kind: 'work' }],
  ['02-14', { name: '春节', kind: 'work' }],
  ['05-08', { name: '劳动节', kind: 'work' }],
  ['09-26', { name: '国庆节', kind: 'work' }],
  ['10-09', { name: '国庆节', kind: 'work' }],
]);
for (const [name, month, firstDay, lastDay] of restPeriods2027) {
  for (let day = firstDay; day <= lastDay; day++) {
    holidays2027.set(`${month}-${String(day).padStart(2, '0')}`, { name, kind: 'rest' });
  }
}

export function getCalendarHoliday(date: Dayjs): CalendarHoliday | undefined {
  if (date.year() === 2027) {
    return holidays2027.get(date.format('MM-DD'));
  }

  const holiday = HolidayUtil.getHoliday(date.year(), date.month() + 1, date.date());
  return holiday ? { name: holiday.getName(), kind: holiday.isWork() ? 'work' : 'rest' } : undefined;
}

export function calendarHolidayLabel(holiday: CalendarHoliday, includeName = true): string {
  const prefix = includeName ? holiday.name : '';
  switch (holiday.kind) {
    case 'work': return `${prefix}调休上班`;
    case 'rest': return `${prefix}放假`;
  }
}
