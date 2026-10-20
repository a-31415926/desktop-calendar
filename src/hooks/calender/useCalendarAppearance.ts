import { useConfigSync } from '../../sync/configStore.ts';
export type CalendarSize = 'compact' | 'standard' | 'large';
export function setCalendarSize(value: CalendarSize) {
  void useConfigSync.getState().sync('calendarScale', {compact:65,standard:75,large:100}[value]);
}
export function useCalendarAppearance(): CalendarSize {
  const scale = useConfigSync(s => s.data.calendarScale);
  return scale <= 65 ? 'compact' : scale < 95 ? 'standard' : 'large';
}
