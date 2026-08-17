import { ClockCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import classNames from 'classnames';
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

  return (
    <div className={styles.footerInfo}>
      {showStatusCard && (
        <section className={styles.footerCard}>
          <div className={styles.footerSectionTitle}>今日状态</div>
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
          {hasFestivalSection && hasCountdownSection && <div className={styles.footerDivider} />}
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
