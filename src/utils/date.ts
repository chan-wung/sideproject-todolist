function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return parseLocalDate(dueDate) < new Date(new Date().toDateString());
}
export function isToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  return parseLocalDate(dueDate).toDateString() === new Date().toDateString();
}
export function isThisWeek(dueDate?: string): boolean {
  if (!dueDate) return false;
  const d = new Date(parseLocalDate(dueDate).toDateString()).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return d >= today && d <= today + 7 * 24 * 60 * 60 * 1000;
}
export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateNextRecurrence(dateStr?: string, rule?: 'none' | 'daily' | 'weekly' | 'monthly'): string | undefined {
  if (!rule || rule === 'none') return undefined;
  const baseDate = dateStr ? parseLocalDate(dateStr) : new Date();
  const nextDate = new Date(baseDate);
  if (rule === 'daily') nextDate.setDate(nextDate.getDate() + 1);
  if (rule === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
  if (rule === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
  
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
