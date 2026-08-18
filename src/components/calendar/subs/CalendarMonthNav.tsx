import { CaretDownFilled, CaretUpFilled } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import type { Dayjs } from 'dayjs';
import { type ReactElement, useEffect, useRef } from 'react';
import { useCalendarViewContext } from '../../../hooks/calender/CalendarViewContext.tsx';
import type { CalendarViewClassNames } from '../../../styles/useCalendarViewStyles.ts';

/** 鼠标滚轮 / 触控板累计到这个纵向距离后才切换一个月，避免高灵敏设备一次飞过多个月份。 */
const WHEEL_MONTH_THRESHOLD = 48;
/** 每次成功切月后的短暂冷却时间，吸收同一次滚轮动作产生的惯性事件。 */
const WHEEL_MONTH_COOLDOWN_MS = 220;

export interface CalendarMonthNavProps {
  /** 样式 class 映射 */
  styles: CalendarViewClassNames;
  /** 当前面板显示的月份（与网格首行对齐） */
  panelMonth: Dayjs;
  /** 选中今天并跳到当月 */
  onGoToToday: () => void;
  /** 上一个月 */
  onPrevMonth: () => void;
  /** 下一个月 */
  onNextMonth: () => void;
}

/**
 * 年月标题与「今天」、上/下月切换控件（数据来自 `CalendarViewContext`）。
 */
function CalendarMonthNav(): ReactElement {
  const { navProps } = useCalendarViewContext();
  const { styles, panelMonth, onGoToToday, onPrevMonth, onNextMonth } = navProps;
  const wheelDeltaRef = useRef(0);
  const wheelLockUntilRef = useRef(0);

  /**
   * 整个日历窗口内都支持鼠标滚轮 / 触控板纵向滚动换月：
   * 向上 = 上个月，向下 = 下个月。
   * 横向触控板手势交给原有的触摸换月逻辑，不在这里误触。
   */
  useEffect(() => {
    const handleWheel = (event: WheelEvent): void => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || Math.abs(event.deltaY) < 1) {
        return;
      }

      const now = performance.now();
      if (now < wheelLockUntilRef.current) {
        return;
      }

      // 滚动方向突然反转时清掉之前的累计量，避免来回轻拨产生误切。
      if (
        wheelDeltaRef.current !== 0 &&
        Math.sign(wheelDeltaRef.current) !== Math.sign(event.deltaY)
      ) {
        wheelDeltaRef.current = 0;
      }

      wheelDeltaRef.current += event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < WHEEL_MONTH_THRESHOLD) {
        return;
      }

      if (wheelDeltaRef.current > 0) {
        onNextMonth();
      } else {
        onPrevMonth();
      }

      wheelDeltaRef.current = 0;
      wheelLockUntilRef.current = now + WHEEL_MONTH_COOLDOWN_MS;
    };

    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [onNextMonth, onPrevMonth]);

  return (
    <div className={styles.calendarNav}>
      <div className={styles.navTitle}>
        {panelMonth.year()}年{panelMonth.month() + 1}月
      </div>
      <div className={styles.navBtns}>
        <Tooltip title="回到今天">
          <Button
            autoInsertSpace={false}
            className={classNames(styles.navBtn, styles.todayBtn)}
            size="small"
            type="text"
            shape="circle"
            onClick={onGoToToday}
          >
            今
          </Button>
        </Tooltip>
        <Tooltip title="上个月">
          <Button
            className={styles.navBtn}
            size="small"
            type="text"
            shape="circle"
            onClick={onPrevMonth}
            icon={<CaretUpFilled />}
          />
        </Tooltip>
        <Tooltip title="下个月">
          <Button
            className={styles.navBtn}
            size="small"
            type="text"
            shape="circle"
            onClick={onNextMonth}
            icon={<CaretDownFilled />}
          />
        </Tooltip>
      </div>
    </div>
  );
}

export default CalendarMonthNav;
