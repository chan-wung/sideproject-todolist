export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
export function isToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
}
export function isThisWeek(dueDate?: string): boolean {   // 오늘~향후 7일(지난 건 제외)
  if (!dueDate) return false;
  const d = new Date(new Date(dueDate).toDateString()).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return d >= today && d <= today + 7 * 24 * 60 * 60 * 1000;
}
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
