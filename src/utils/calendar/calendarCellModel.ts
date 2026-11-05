import { type Dayjs } from 'dayjs';
import { Solar } from 'lunar-typescript';
import { getAllFestivals } from './calendarFestivals.ts';
import { calendarHolidayLabel, getCalendarHoliday } from './calendarHolidays.ts';

const publicFestivals = new Set(['元旦节', '春节', '除夕', '劳动节', '端午节', '中秋节', '国庆节']);

/** 单元格右上角「休 / 班」角标类型：休假日或调休工作日 */
export type CalendarCellBadgeVariant = 'rest' | 'work';

/**
 * 单日格子的展示数据（由纯函数算出，供 CalendarMonthGrid 只做渲染）。
 */
export type CalendarCellViewModel = {
  /** 该格对应的公历日期，用于点击回传 */
  date: Dayjs;
  /** React key 与 Tooltip 等用的稳定字符串 */
  dateKey: string;
  /** 农历行展示文案（日期、初一月份、短节日名或节气） */
  displayText: string;
  /** 是否为节气日（控制农历行样式 class） */
  hasJieQi: boolean;
  /** 是否是法定休假中的“真正节日本日”，用于比普通连休日更强的视觉提示 */
  isFestivalHoliday: boolean;
  /** Tooltip 全文，无节日/节气时为 undefined */
  tooltipTitle: string | undefined;
  /** 是否为当天 */
  isToday: boolean;
  /** 是否为当前选中日期 */
  isSelected: boolean;
  /** 是否不属于面板月份（灰色其它月） */
  isOtherMonth: boolean;
  /** 角标「休」「班」或空字符串 */
  badgeText: string;
  /** 角标配色分支；null 表示不显示角标 */
  badgeVariant: CalendarCellBadgeVariant | null;
};

/**
 * 汇总某日格在月视图中的农历文案、节假日角标、选中态等与 UI 相关的数据。
 */
export function getCalendarCellViewModel(
  date: Dayjs,
  panelMonth: Dayjs,
  selectedDate: Dayjs,
  calendarToday: Dayjs,
): CalendarCellViewModel {
  const solar = Solar.fromDate(date.toDate());
  const lunar = solar.getLunar();
  const jieQi = lunar.getJieQi();
  const allFestivals = getAllFestivals(date);
  const publicFestival = allFestivals.find((name) => publicFestivals.has(name));
  const holiday = getCalendarHoliday(date);

  let displayText = lunar.getDayInChinese();
  if (jieQi) {
    displayText = jieQi;
  } else if (publicFestival && holiday && holiday.kind !== 'work') {
    displayText = publicFestival;
  } else if (lunar.getDay() === 1) {
    displayText = `${lunar.getMonthInChinese()}月`;
  } else {
    const shortFestival = allFestivals.find((festival) => festival.length < 4);
    if (shortFestival) {
      displayText = shortFestival;
    }
  }

  const isToday = date.isSame(calendarToday, 'date');
  const isSelected = selectedDate.isSame(date, 'date');
  const isOtherMonth = date.month() !== panelMonth.month();
  const badgeVariant: CalendarCellBadgeVariant | null = holiday
    ? holiday.kind === 'work' ? 'work' : 'rest'
    : null;
  const badgeText = holiday?.kind === 'statutory' ? '假' : badgeVariant === 'rest' ? '休' : badgeVariant === 'work' ? '班' : '';
  const isFestivalHoliday = badgeVariant === 'rest' && Boolean(jieQi === '清明' || publicFestival);

  const cellFestivals = [...allFestivals];
  if (jieQi) cellFestivals.unshift(jieQi);
  if (holiday) cellFestivals.unshift(calendarHolidayLabel(holiday));
  if (holiday?.kind === 'statutory') cellFestivals.push('调休待公布');

  return {
    date,
    dateKey: date.format('YYYY-MM-DD'),
    displayText,
    hasJieQi: Boolean(jieQi),
    isFestivalHoliday,
    tooltipTitle: cellFestivals.length > 0 ? cellFestivals.join(' · ') : undefined,
    isToday,
    isSelected,
    isOtherMonth,
    badgeText,
    badgeVariant,
  };
}
