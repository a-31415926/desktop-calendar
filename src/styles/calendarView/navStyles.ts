import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarNavStyles(ctx: CalendarViewStyleContext) {
  const { css, isDark } = ctx;

  return {
    calendarNav: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 9px;
      padding: 0 3px;
    `,
    navTitle: css`
      font-size: 16px;
      font-weight: 650;
      color: var(--text-main);
    `,
    navBtns: css`
      display: flex;
      gap: 6px;
      align-items: center;
      font-size: 11px;
      color: var(--text-sec);
    `,
    navBtn: css`
      && {
        color: var(--text-main);
        min-width: 28px;
        height: 28px;
      }

      &&:not(:disabled):hover {
        color: var(--text-main);
        background: ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.05)'} !important;
      }
    `,
    todayBtn: css`
      && {
        font-size: 12px;
        font-weight: 600;
      }
    `,
  };
}
