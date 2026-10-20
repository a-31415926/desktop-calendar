import { useEffect, useState } from 'react';
export type CalendarSize = 'compact' | 'standard' | 'large';
const key = 'desktop-calendar-size-v14-7';
export function readCalendarSize(): CalendarSize {
  try { const value = localStorage.getItem(key); if (value === 'compact' || value === 'standard' || value === 'large') return value; } catch { /* Use the readable default when storage is unavailable. */ }
  return 'large';
}
export function setCalendarSize(value: CalendarSize) {
  try { localStorage.setItem(key, value); } catch { /* The current window can still switch size. */ }
  window.dispatchEvent(new CustomEvent('calendar-size-changed', {detail: value}));
}
export function useCalendarAppearance() {
  const [size, setSize] = useState<CalendarSize>(readCalendarSize);
  useEffect(() => {
    const changed = (event: Event) => setSize((event as CustomEvent<CalendarSize>).detail || readCalendarSize());
    window.addEventListener('calendar-size-changed', changed);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('calendar-size-changed', changed); window.removeEventListener('storage', changed); };
  }, []);
  return size;
}
