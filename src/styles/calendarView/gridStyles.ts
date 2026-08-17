import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarGridStyles(ctx: CalendarViewStyleContext) {
  const { css, cx, isDark } = ctx;

  const lunar = css`
    font-size: 11px;
    color: ${isDark ? '#a8a8a8' : '#68717d'};
    line-height: 1.04;
    margin-top: 2px;
    font-weight: 500;
  `;
  const term = css`
    color: ${isDark ? '#71d6b0' : '#0f7a52'};
    font-weight: 700;
  `;

  return {
    calendarGrid: css`
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      column-gap: 3px;
      row-gap: 5px;
      justify-items: center;
      align-items: center;
    `,
    weekday: css`
      width: 100%;
      text-align: center;
      font-size: 14px;
      font-weight: 650;
      color: var(--text-main);
      padding-bottom: 7px;
      height: 22px;
    `,
    cell: css`
      width: 41px;
      height: 44px;
      box-sizing: border-box;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: 11px;
      transition: background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
      cursor: pointer;
      position: relative;
      padding: 0;
      color: var(--text-main);

      &:hover {
        background: ${isDark ? 'rgba(255,255,255,.09)' : 'rgba(17,24,39,.045)'};
      }
    `,
    taggedCell: css`
      padding-top: 6px;
    `,
    // V9 恢复长假连续高亮，但普通休假仅铺一层很淡的奶油杏，避免形成厚重橙色砖块。
    restDay: css`
      background: ${isDark ? 'rgba(141, 91, 69, 0.18)' : '#fff5ee'};
      border-color: ${isDark ? 'rgba(205, 150, 126, 0.15)' : '#f3ddd0'};
      color: var(--text-main);

      .${cx(lunar)} {
        color: ${isDark ? '#c8aaa0' : '#876d61'};
      }

      &:hover {
        background: ${isDark ? 'rgba(141, 91, 69, 0.26)' : '#ffefe5'};
        border-color: ${isDark ? 'rgba(205, 150, 126, 0.24)' : '#edcdbd'};
      }
    `,
    otherMonth: css`
      color: ${isDark ? '#666b73' : '#b7bdc6'};

      .${cx(lunar)} {
        color: ${isDark ? '#62666d' : '#b8bdc5'};
      }
    `,
    // 真正节日本日在连续休假底色上再提高一级，让“节日”和“只是放假”仍有层级。
    festivalRestDay: css`
      background: ${isDark ? 'rgba(156, 92, 70, 0.28)' : '#ffebdd'};
      border-color: ${isDark ? 'rgba(220, 145, 113, 0.28)' : '#f1c8ae'};
      color: ${isDark ? '#ffd0bc' : '#7d3f25'};

      .${cx(lunar)} {
        color: ${isDark ? '#f3bca7' : '#b95532'};
        font-weight: 650;
      }

      &:hover {
        background: ${isDark ? 'rgba(156, 92, 70, 0.36)' : '#ffe3d2'};
        border-color: ${isDark ? 'rgba(220, 145, 113, 0.38)' : '#eab996'};
      }
    `,
    today: css`
      background: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
      box-shadow: 0 2px 7px ${isDark ? 'rgba(96,205,255,.18)' : 'rgba(22,119,210,.22)'};
      border-radius: 50%;

      .${cx(lunar)} {
        color: ${isDark ? '#eefaff' : '#eef6ff'};
      }
      .${cx(term)} {
        color: #ffffff;
      }
      &:hover {
        background: ${isDark ? '#70d4ff' : '#0f6fc8'};
        border-color: ${isDark ? '#70d4ff' : '#0f6fc8'};
      }
    `,
    selected: css`
      box-shadow: inset 0 0 0 1.5px var(--accent);
      background: ${isDark ? 'rgba(96,205,255,.08)' : '#f4f8fc'};
      border-color: transparent;
      border-radius: 10px;
    `,
    dateText: css`
      font-size: 16px;
      font-weight: 520;
      line-height: 1;
    `,
    lunar,
    term,
    tag: css`
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 8px;
      min-width: 13px;
      height: 13px;
      padding: 0 2px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 750;
      z-index: 2;
      border-radius: 5px;
      line-height: 1;
      box-shadow: 0 1px 2px ${isDark ? 'rgba(0,0,0,.20)' : 'rgba(80,50,30,.06)'};
    `,
    tagWork: css`
      background: ${isDark ? '#34445f' : '#e4eef9'};
      color: ${isDark ? '#b8d5ff' : '#315f91'};
    `,
    tagRest: css`
      background: ${isDark ? '#b45f43' : '#e97855'};
      color: #ffffff;
    `,
  };
}
