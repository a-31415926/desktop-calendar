import type { Dayjs } from 'dayjs';
import { HolidayUtil } from 'lunar-typescript';

// 内地法定假日依据国务院令第795号，农历与节气日期对照香港天文台2027年年历。
// https://www.gov.cn/zhengce/zhengceku/202411/content_6986381.htm
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2027.pdf
const statutoryDays2027: Readonly<Record<string, string | undefined>> = {
  '2027-01-01': '元旦',
  '2027-02-05': '春节',
  '2027-02-06': '春节',
  '2027-02-07': '春节',
  '2027-02-08': '春节',
  '2027-04-05': '清明节',
  '2027-05-01': '劳动节',
  '2027-05-02': '劳动节',
  '2027-06-09': '端午节',
  '2027-09-15': '中秋节',
  '2027-10-01': '国庆节',
  '2027-10-02': '国庆节',
  '2027-10-03': '国庆节',
};

type CalendarHoliday = { name: string; kind: 'statutory' | 'rest' | 'work' };

export function isHolidaySchedulePending(year: number): boolean {
  return year === 2027;
}

export function getCalendarHoliday(date: Dayjs): CalendarHoliday | undefined {
  if (isHolidaySchedulePending(date.year())) {
    const name = statutoryDays2027[date.format('YYYY-MM-DD')];
    return name ? { name, kind: 'statutory' } : undefined;
  }

  const holiday = HolidayUtil.getHoliday(date.year(), date.month() + 1, date.date());
  return holiday ? { name: holiday.getName(), kind: holiday.isWork() ? 'work' : 'rest' } : undefined;
}

export function calendarHolidayLabel(holiday: CalendarHoliday): string {
  switch (holiday.kind) {
    case 'statutory': return `${holiday.name}法定假日`;
    case 'work': return `${holiday.name}调休上班`;
    case 'rest': return `${holiday.name}放假`;
  }
}
