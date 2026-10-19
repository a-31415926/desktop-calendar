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

  const {
    styles,
    hasFestivalSection,
    hasYiJiSection,
    hasCountdownSection,
    selectedFestivals,
    onFestivalClick,
    selectedLunar,
    holidayCountdown,
  } = footerProps;

  const showStatusCard = hasFestivalSection || hasCountdownSection;
  const selectedSolar = selectedLunar.getSolar();
  const selectedDate = dayjs(
    `${selectedSolar.getYear()}-${String(selectedSolar.getMonth()).padStart(2, '0')}-${String(selectedSolar.getDay()).padStart(2, '0')}`,
  ).startOf('day');
  const today = dayjs().startOf('day');
  const relativeDays = selectedDate.diff(today, 'day');
  const relativeLabel =
    relativeDays === 0
      ? '就是今天'
      : relativeDays > 0
        ? `${relativeDays} 天后`
        : `${Math.abs(relativeDays)} 天前`;

  return (
    <div className={styles.footerInfo}>
      {showStatusCard && (
        <section className={styles.footerCard}>
          <div className={styles.footerSectionTitle}>日期信息</div>
          {hasFestivalSection && (
            <div className={styles.festivalSection}>
              {selectedFestivals.length > 0 ? (
                <div className={styles.festivalList}>
                  {selectedFestivals.map((name, index) => (
                    <React.Fragment key={`${name}-${index}`}>
                      <Tooltip title={`在百度百科中查看 ${name}`}>
                        <button
                          type="button"
                          className={styles.festivalItem}
                          onClick={() => onFestivalClick(name)}
                        >
                          {name}
                        </button>
                      </Tooltip>
                      {index < selectedFestivals.length - 1 && (
                        <span className={styles.festivalSeparator}>·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className={styles.festivalEmpty}>当前无节假日</div>
              )}
            </div>
          )}
          {hasFestivalSection && <div className={styles.footerDivider} />}
          <div className={styles.countdown}>
            <ClockCircleOutlined className={styles.countdownIcon} />
            <span>
              距今天 <strong>{relativeLabel}</strong>
            </span>
          </div>
          {hasCountdownSection && holidayCountdown && (
            <div className={styles.countdown}>
              <ClockCircleOutlined className={styles.countdownIcon} />
              <span>
                距离 {holidayCountdown.date} {holidayCountdown.name} 还有{' '}
                <strong>{holidayCountdown.days}</strong> 天
              </span>
            </div>
          )}
        </section>
      )}

      {hasYiJiSection && (
        <section className={styles.footerCard}>
          <div className={styles.footerSectionTitle}>今日宜忌</div>
          <div className={styles.footerMain}>
            <div className={styles.yiJiContainer}>
              <div className={styles.yiJiItem}>
                <div className={classNames(styles.yiJiBadge, styles.yiBadge)}>宜</div>
                <Tooltip title={selectedLunar.getDayYi().join(' · ')}>
                  <div className={styles.yiJiText}>{selectedLunar.getDayYi().join(' · ')}</div>
                </Tooltip>
              </div>
              <div className={styles.yiJiItem}>
                <div className={classNames(styles.yiJiBadge, styles.jiBadge)}>忌</div>
                <Tooltip title={selectedLunar.getDayJi().join(' · ')}>
                  <div className={styles.yiJiText}>{selectedLunar.getDayJi().join(' · ')}</div>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default CalendarFooter;
