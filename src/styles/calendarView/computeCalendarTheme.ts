import type { CalendarThemeTokens, CalendarViewStyleProps } from './types.ts';

/** 根据透明 / 深浅色 / 背景不透明度推导壳层用色与阴影 */
export function computeCalendarTheme({
  transparent,
  isDark,
  backgroundOpacity,
}: CalendarViewStyleProps): CalendarThemeTokens {
  const safeOpacity = Math.max(0, Math.min(100, backgroundOpacity ?? 100)) / 100;
  const containerBackground = transparent
    ? isDark
      ? `rgba(32, 32, 32, ${safeOpacity})`
      : `rgba(247, 248, 250, ${Math.max(safeOpacity, 0.9)})`
    : isDark
      ? '#202020'
      : '#f7f8fa';
  const backdropFilter = transparent ? 'blur(18px) saturate(1.08)' : 'none';
  const borderColor = isDark ? 'rgba(255,255,255,.12)' : '#dde2e7';
  const shadowValue = transparent
    ? isDark
      ? '0 12px 34px rgba(0,0,0,.34)'
      : '0 12px 34px rgba(25,35,45,.15)'
    : isDark
      ? '0 10px 34px rgba(0,0,0,.4)'
      : '0 10px 34px rgba(25,35,45,.14)';
  const overlayBackground = 'none';
  const textureBackground = 'none';

  return {
    containerBackground,
    borderColor,
    shadowValue,
    backdropFilter,
    overlayBackground,
    textureBackground,
  };
}
