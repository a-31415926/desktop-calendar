import type { CalendarViewStyleContext } from './types.ts';

export function createCalendarShellStyles(ctx: CalendarViewStyleContext) {
  const {
    css,
    containerBackground,
    borderColor,
    shadowValue,
    backdropFilter,
    overlayBackground,
    textureBackground,
    isDark,
  } = ctx;

  return {
    micaContainer: css`
      --mica-bg: ${containerBackground};
      --card-bg: ${isDark ? 'rgba(45,45,45,.55)' : '#fcfcfd'};
      --accent: ${isDark ? '#60cdff' : '#1677d2'};
      --text-main: ${isDark ? '#ffffff' : '#1f2328'};
      --text-sec: ${isDark ? '#cccccc' : '#66707c'};
      width: 332px;
      background: var(--mica-bg);
      backdrop-filter: ${backdropFilter};
      -webkit-backdrop-filter: ${backdropFilter};
      border: 1px solid ${borderColor};
      box-shadow: var(--calendar-shadow, ${shadowValue});
      border-radius: var(--calendar-radius, 15px);
      clip-path: inset(0 round var(--calendar-radius, 15px));
      overflow: hidden;
      padding: 12px;
      color: var(--text-main);
      margin: 0;
      touch-action: none;
      user-select: none;
      position: relative;
      isolation: isolate;

      &::before,
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
      }

      &::before {
        z-index: 0;
        background: ${overlayBackground};
        opacity: 0;
      }

      &::after {
        z-index: 0;
        background: ${textureBackground};
        opacity: 0;
        mix-blend-mode: normal;
      }

      & > * {
        position: relative;
        z-index: 1;
        opacity: var(--calendar-content-opacity, 1);
        transition:
          opacity var(--calendar-content-fade-duration, 0ms)
            var(--calendar-content-fade-easing, ease)
            var(--calendar-content-fade-delay, 0ms);
      }
    `,
  };
}
