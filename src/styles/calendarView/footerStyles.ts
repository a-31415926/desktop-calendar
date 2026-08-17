import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarFooterStyles(ctx: CalendarViewStyleContext) {
  const { css, isDark } = ctx;

  return {
    footerInfo: css`
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    `,
    footerCard: css`
      padding: 12px 14px;
      border-radius: 13px;
      background: ${isDark ? 'rgba(255,255,255,.045)' : '#f3f4f6'};
      border: 1px solid ${isDark ? 'rgba(255,255,255,.07)' : '#e4e7eb'};
      min-width: 0;
    `,
    footerSectionTitle: css`
      font-size: 15px;
      line-height: 1.2;
      font-weight: 650;
      color: var(--text-main);
      margin-bottom: 9px;
    `,
    footerMain: css`
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      min-width: 0;
    `,
    lunarInfo: css`
      display: flex;
      flex-direction: column;
      gap: 2px;
    `,
    lunarDay: css`
      font-size: 16px;
      font-weight: 500;
      color: var(--text-main);
    `,
    lunarYear: css`
      font-size: 12px;
      color: var(--text-sec);
    `,
    festivalList: css`
      font-size: 13px;
      color: var(--text-main);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex-wrap: nowrap;
      white-space: nowrap;
      overflow: hidden;
    `,
    festivalSection: css`
      display: flex;
      align-items: center;
      min-height: 20px;
    `,
    festivalItem: css`
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font: inherit;
      line-height: 1.35;
      flex-shrink: 0;
      &:hover {
        color: var(--accent);
        text-decoration: underline;
      }
    `,
    festivalSeparator: css`
      color: var(--text-sec);
      opacity: 0.65;
      flex-shrink: 0;
    `,
    festivalEmpty: css`
      font-size: 13px;
      color: var(--text-sec);
    `,
    yiJiContainer: css`
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-width: 0;
    `,
    yiJiItem: css`
      display: flex;
      align-items: flex-start;
      gap: 9px;
      font-size: 14px;
      min-width: 0;
    `,
    yiJiBadge: css`
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
      border-radius: 50%;
    `,
    yiBadge: css`
      background: ${isDark ? '#1e3a2f' : '#e6f4ea'};
      color: ${isDark ? '#81c784' : '#1e8e3e'};
    `,
    jiBadge: css`
      background: ${isDark ? '#3c1e1e' : '#fce8e6'};
      color: ${isDark ? '#f28b82' : '#d93025'};
    `,
    yiJiText: css`
      color: var(--text-main);
      line-height: 1.5;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    `,
    footerDivider: css`
      height: 1px;
      background: ${isDark ? 'rgba(255,255,255,.09)' : '#e1e4e8'};
      margin: 10px 0;
    `,
    countdown: css`
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      color: var(--text-sec);

      strong {
        color: var(--text-main);
        font-weight: 700;
      }
    `,
    countdownIcon: css`
      font-size: 15px;
      opacity: 0.85;
    `,
  };
}
