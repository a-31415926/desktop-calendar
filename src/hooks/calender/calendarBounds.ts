export function calendarLimits(area: { width: number; height: number }, scale: number) {
  const dpi = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return { width: Math.max(1, Math.floor(area.width / dpi - 24)), height: Math.max(1, Math.floor(area.height / dpi - 12)) };
}
export function popupPosition(area: { position: { x: number; y: number }; size: { width: number; height: number } }, size: { width: number; height: number }, scale: number) {
  const gap = Math.round(12 * scale);
  return { x: Math.round(Math.max(area.position.x + gap, area.position.x + area.size.width - size.width - gap)), y: Math.round(Math.max(area.position.y, area.position.y + area.size.height - size.height)) };
}

/** Scale the complete fixed-layout canvas; fit first, then apply the user preference. */
export function wholeCalendarScale(size:'compact'|'standard'|'large',limits:{width:number;height:number}) {
 const fit=Math.min(1,limits.width/776,limits.height/596);
 return Math.max(0.001,fit*({compact:0.82,standard:0.91,large:1}[size]));
}
