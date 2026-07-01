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

export function calculateNextRecurrence(dateStr?: string, rule?: 'none' | 'daily' | 'weekly' | 'monthly'): string | undefined {
  if (!rule || rule === 'none') return undefined;
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  const nextDate = new Date(baseDate);
  if (rule === 'daily') nextDate.setDate(nextDate.getDate() + 1);
  if (rule === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
  if (rule === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
  
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
