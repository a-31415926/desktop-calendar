import { Tooltip } from 'antd';
import classNames from 'classnames';
import type { Dayjs } from 'dayjs';
import type { ReactElement } from 'react';
import { useCalendarViewContext } from '../../../hooks/calender/CalendarViewContext.tsx';
import type { CalendarViewClassNames } from '../../../styles/useCalendarViewStyles.ts';
import type { CalendarCellViewModel } from '../../../utils/calendar/calendarCellModel.ts';
import { weekdays } from '../../../utils/calendar/calendarFestivals.ts';
import {useCalendarWeather} from '../../../weather/CalendarWeatherContext.ts';
import {calendarDayWeather} from '../../../weather/calendarWeather.ts';
import {number,weatherCode} from '../../../weather/model.ts';

export function WeatherMark({code}:{code:number}) {
  const type=weatherCode(code)[1];
  return <svg viewBox="0 0 24 24" width="14" height="14" aria-label={weatherCode(code)[0]} role="img">
    {(type==='sun'||type==='cloud-sun')&&<circle cx="9" cy="8" r="5" fill="#e2ac39"/>}
    {type!=='sun'&&<path d="M5 17h13a4 4 0 0 0 0-8h-1a6 6 0 0 0-11-1 5 5 0 0 0-1 9" fill="#b6cfdf" stroke="#648da7"/>}
    {(type==='rain'||type==='storm')&&<path d="m7 19-1 3m6-3-1 3m6-3-1 3" stroke="#378fca" strokeWidth="2"/>}
    {type==='snow'&&<path d="M7 20h1m4 1h1m4-1h1" stroke="#378fca" strokeWidth="3"/>}
    {type==='fog'&&<path d="M4 20h16M7 23h11" stroke="#6a8e9f"/>}
  </svg>;
}

export interface CalendarMonthGridProps {
  /** antd-style 生成的 className 映射 */
  styles: CalendarViewClassNames;
  /** 已由逻辑层算好的 42 格展示模型 */
  cellModels: CalendarCellViewModel[];
  /** 用户点击某一格时回传该格公历日期 */
  onSelectDate: (date: Dayjs) => void;
}

/**
 * 月历主体：星期表头 + 日期格子（数据来自 `CalendarViewContext`）。
 */
function CalendarMonthGrid(): ReactElement {
  const { gridProps } = useCalendarViewContext();
  const { styles, cellModels, onSelectDate } = gridProps;
  const weather=useCalendarWeather();
  // 始终显示 42 格（六行），避免不同月份切换时根容器高度变化，触发窗口 resize 抽动。
  const visibleCells = cellModels;

  return (
    <div className={styles.calendarGrid} data-month-grid>
      {weekdays.map((day) => (
        <div data-weekday className={styles.weekday} key={day}>
          {day}
        </div>
      ))}
      {visibleCells.map((cell) => {
        const dayWeather=calendarDayWeather(weather,cell.dateKey);
        /** 「休」「班」角标对应不同背景色 class */
        const badgeClass =
          cell.badgeVariant === 'rest'
            ? styles.tagRest
            : cell.badgeVariant === 'work'
              ? styles.tagWork
              : '';

        return (
          <Tooltip key={cell.dateKey} title={cell.tooltipTitle} mouseEnterDelay={0.5}>
            <button
              type="button" data-day-cell
              aria-current={cell.isToday?'date':undefined}
              aria-pressed={cell.isSelected}
              data-selected={cell.isSelected?'true':undefined}
              data-date={cell.dateKey}
              title={dayWeather?`${cell.tooltipTitle??cell.date.format("M月D日")} · ${dayWeather.label} ${number(dayWeather.high)} / ${number(dayWeather.low)}°`:cell.tooltipTitle}
              className={classNames(styles.cell, {
                [styles.taggedCell]: Boolean(cell.badgeText),
                [styles.otherMonth]: cell.isOtherMonth,
                [styles.restDay]: cell.badgeVariant === 'rest',
                [styles.festivalRestDay]: cell.isFestivalHoliday,
                [styles.today]: cell.isToday,
                [styles.selected]: cell.isSelected && !cell.isToday,
              })}
              onClick={() => onSelectDate(cell.date)}
            >
              {cell.badgeText && (
                <span className={classNames(styles.tag, badgeClass)}>{cell.badgeText}</span>
              )}
              <span data-date-number className={styles.dateText}>{cell.date.date()}</span>
              <span data-lunar-day className={classNames(styles.lunar, { [styles.term]: cell.hasJieQi })}>
                {cell.displayText}
              </span>
              <span className="calendar-cell-weather" aria-label={dayWeather?`${dayWeather.label} 最高${number(dayWeather.high)}度 最低${number(dayWeather.low)}度`:undefined}>{dayWeather&&<><WeatherMark code={dayWeather.code}/><span>{number(dayWeather.high)}/{number(dayWeather.low)}°</span></>}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default CalendarMonthGrid;
