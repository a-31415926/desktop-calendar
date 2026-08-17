import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarNavStyles(ctx: CalendarViewStyleContext) {
  const { css, isDark } = ctx;

  return {
    calendarNav: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
    `,
    navTitle: css`
      font-size: 17px;
      font-weight: 650;
      color: var(--text-main);
    `,
    navBtns: css`
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 11px;
      color: var(--text-sec);
    `,
    navBtn: css`
      && {
        color: var(--text-main);
        min-width: 30px;
        height: 30px;
      }

      &&:not(:disabled):hover {
        color: var(--text-main);
        background: ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.05)'} !important;
      }
    `,
    todayBtn: css`
      && {
        font-size: 13px;
        font-weight: 600;
      }
    `,
  };
}
