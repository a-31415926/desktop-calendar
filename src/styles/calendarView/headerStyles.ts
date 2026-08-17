import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarHeaderStyles(ctx: CalendarViewStyleContext) {
  const { css, isDark } = ctx;

  return {
    header: css`
      text-align: left;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    `,
    headerContent: css`
      display: flex;
      flex-direction: column;
      min-width: 0;
    `,
    headerActions: css`
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    `,
    headerBtn: css`
      background: ${isDark ? 'rgba(255,255,255,.055)' : '#f4f5f7'};
      border: 1px solid ${isDark ? 'rgba(255,255,255,.06)' : '#eceff2'};
      width: 30px;
      height: 30px;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s ease, border-color .15s ease;
      color: var(--text-sec);
      flex-shrink: 0;
      border-radius: 50%;

      &:hover {
        background: ${isDark ? 'rgba(255,255,255,.14)' : '#eceff3'};
        border-color: ${isDark ? 'rgba(255,255,255,.1)' : '#e2e6ea'};
      }
    `,
    title: css`
      font-size: 18px;
      font-weight: 650;
      line-height: 1.18;
      margin-bottom: 4px;
      color: var(--text-main);
      letter-spacing: .1px;
    `,
    subtitle: css`
      font-size: 13px;
      line-height: 1.2;
      color: var(--text-sec);
      opacity: .92;
    `,
    festivalList: css`
      font-size: 12px;
      color: var(--text-main);
      font-weight: 500;
      padding: 0 2px 1px;
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      flex-wrap: nowrap;
      white-space: nowrap;
      overflow: hidden;
    `,
    festivalSection: css`
      display: flex;
      align-items: center;
      min-height: 18px;
    `,
    festivalItem: css`
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font: inherit;
      line-height: 1.3;
      flex-shrink: 0;
      transition: opacity .2s;
      &:hover {
        opacity: .72;
        text-decoration: underline;
      }
    `,
    festivalSeparator: css`
      color: var(--text-sec);
      opacity: .7;
      flex-shrink: 0;
    `,
    festivalEmpty: css`
      font-size: 12px;
      color: var(--text-sec);
      opacity: .9;
      padding: 0 2px;
    `,
  };
}
