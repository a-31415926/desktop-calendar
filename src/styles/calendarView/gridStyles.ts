import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarGridStyles(ctx: CalendarViewStyleContext) {
  const { css, cx, isDark } = ctx;

  const lunar = css`
    font-size: 12px;
    color: ${isDark ? '#a8a8a8' : '#6b7280'};
    line-height: 1.05;
    margin-top: 3px;
    font-weight: 500;
  `;
  const term = css`
    color: ${isDark ? '#79c5d8' : '#2f7f95'};
    font-weight: 600;
  `;

  return {
    calendarGrid: css`
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      column-gap: 4px;
      row-gap: 7px;
      justify-items: center;
      align-items: center;
    `,
    weekday: css`
      width: 100%;
      text-align: center;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
      padding-bottom: 9px;
      height: 25px;
    `,
    cell: css`
      width: 45px;
      height: 48px;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 13px;
      transition: background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
      cursor: pointer;
      position: relative;
      padding: 0;
      color: var(--text-main);

      &:hover {
        background: ${isDark ? 'rgba(255,255,255,.09)' : 'rgba(17,24,39,.045)'};
      }
    `,
    restDay: css`
      background: ${isDark ? 'rgba(156, 92, 70, 0.24)' : '#faf0ea'};
      color: ${isDark ? '#ffb6a1' : '#c96e4b'};

      .${cx(lunar)} {
        color: ${isDark ? '#efb7a7' : '#b96c52'};
      }

      &:hover {
        background: ${isDark ? 'rgba(156, 92, 70, 0.32)' : '#f7e8de'};
      }
    `,
    otherMonth: css`
      color: ${isDark ? '#666b73' : '#b7bdc6'};

      .${cx(lunar)} {
        color: ${isDark ? '#62666d' : '#b8bdc5'};
      }
    `,
    today: css`
      background: ${isDark ? 'rgba(96,205,255,.12)' : '#edf6ff'};
      color: var(--accent);
      box-shadow: inset 0 0 0 2px var(--accent);
      border-radius: 50%;

      .${cx(lunar)} {
        color: ${isDark ? '#a8ddf4' : '#4f6f8a'};
      }
      .${cx(term)} {
        color: var(--accent);
      }
      &:hover {
        background: ${isDark ? 'rgba(96,205,255,.18)' : '#e3f1ff'};
      }
    `,
    selected: css`
      box-shadow: inset 0 0 0 1.5px var(--accent);
      background: ${isDark ? 'rgba(96,205,255,.08)' : '#f3f8fd'};
      border-radius: 50%;
    `,
    dateText: css`
      font-size: 17px;
      font-weight: 500;
      line-height: 1;
    `,
    lunar,
    term,
    tag: css`
      position: absolute;
      top: 1px;
      right: 1px;
      font-size: 9px;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      z-index: 1;
      border-radius: 5px;
      line-height: 1;
    `,
    tagWork: css`
      background: ${isDark ? '#34445f' : '#e6eef8'};
      color: ${isDark ? '#b8d5ff' : '#4f6483'};
    `,
    tagRest: css`
      background: ${isDark ? '#a35942' : '#e07a57'};
      color: #ffffff;
    `,
  };
}
