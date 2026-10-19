import { ClockCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import classNames from 'classnames';
import dayjs from 'dayjs';
import type { Lunar } from 'lunar-typescript';
import React, { type ReactElement } from 'react';
import { useCalendarViewContext } from '../../../hooks/calender/CalendarViewContext.tsx';
import type { HolidayCountdownInfo } from '../../../hooks/calender/useHolidayCountdown.ts';
import type { CalendarViewClassNames } from '../../../styles/useCalendarViewStyles.ts';

export interface CalendarFooterProps {
  styles: CalendarViewClassNames;
  hasFestivalSection: boolean;
  hasYiJiSection: boolean;
  hasCountdownSection: boolean;
  selectedFestivals: string[];
  onFestivalClick: (name: string) => void;
  selectedLunar: Lunar;
  holidayCountdown: HolidayCountdownInfo | null;
}
function CalendarFooter(): ReactElement | null {
  const { footerProps } = useCalendarViewContext();
  if (!footerProps) return null;
  const { styles, hasFestivalSection, hasYiJiSection, hasCountdownSection, selectedFestivals, onFestivalClick, selectedLunar, holidayCountdown } = footerProps;
  const solar = selectedLunar.getSolar();
  const selectedDate = dayjs(`${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`).startOf('day');
  const delta = selectedDate.diff(dayjs().startOf('day'), 'day');
  const hasFestival = hasFestivalSection && selectedFestivals.length > 0;
  const showDateCard = hasFestival || (hasCountdownSection && !!holidayCountdown) || (delta !== 0 && (hasFestivalSection || hasCountdownSection));
  return (
    <div className={styles.footerInfo}>
      {showDateCard && (
        <section className={styles.footerCard}>
          <div className={styles.footerSectionTitle}>日期信息</div>
          {hasFestival && <div className={styles.festivalSection}><div className={styles.festivalList}>
            {selectedFestivals.map((name,index) => (
              <React.Fragment key={`${name}-${index}`}>
                <Tooltip title={`查看 ${name}`}><button type="button" className={styles.festivalItem} onClick={() => onFestivalClick(name)}>{name}</button></Tooltip>
                {index < selectedFestivals.length - 1 && <span className={styles.festivalSeparator}>·</span>}
              </React.Fragment>
            ))}
          </div></div>}
          {delta !== 0 && <div className={styles.countdown}><ClockCircleOutlined className={styles.countdownIcon} /><span>距今天 <strong>{delta > 0 ? `${delta} 天后` : `${Math.abs(delta)} 天前`}</strong></span></div>}
          {hasCountdownSection && holidayCountdown && <div className={styles.countdown}><ClockCircleOutlined className={styles.countdownIcon}/><span>距离 {holidayCountdown.date} {holidayCountdown.name} 还有 <strong>{holidayCountdown.days}</strong> 天</span></div>}
        </section>
      )}
      {hasYiJiSection && <section className={styles.footerCard}>
        <div className={styles.footerSectionTitle}>今日宜忌</div>
        <div className={styles.footerMain}><div className={styles.yiJiContainer}>
          <div className={styles.yiJiItem}><div className={classNames(styles.yiJiBadge,styles.yiBadge)}>宜</div><Tooltip title={selectedLunar.getDayYi().join(' · ')}><div className={styles.yiJiText}>{selectedLunar.getDayYi().join(' · ')}</div></Tooltip></div>
          <div className={styles.yiJiItem}><div className={classNames(styles.yiJiBadge,styles.jiBadge)}>忌</div><Tooltip title={selectedLunar.getDayJi().join(' · ')}><div className={styles.yiJiText}>{selectedLunar.getDayJi().join(' · ')}</div></Tooltip></div>
        </div></div>
      </section>}
    </div>
  );
}
export default CalendarFooter;
