export function calendarLimits(area: { width: number; height: number }, scale: number) {
  const dpi = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return { width: Math.max(1, Math.floor(area.width / dpi - 24)), height: Math.max(1, Math.floor(area.height / dpi - 24)) };
}
export function popupPosition(area: { position: { x: number; y: number }; size: { width: number; height: number } }, size: { width: number; height: number }, scale: number) {
  const gap = Math.round(12 * scale);
  return { x: Math.round(Math.max(area.position.x + gap, area.position.x + area.size.width - size.width - gap)), y: Math.round(Math.max(area.position.y + gap, area.position.y + area.size.height - size.height - gap)) };
}
