import type { CalendarItem } from './calendar';
import { cx } from './classNames';

/** 캘린더 띠·배지에 붙이는 클래스 (종류·예정·완료) */
export function itemClass(item: CalendarItem, block: string): string {
  return cx(
    block,
    `${block}--${item.kind}`,
    item.upcoming ? `${block}--upcoming` : '',
    item.completed ? `${block}--done` : '',
  );
}

/** 요일(0=일 … 6=토)에 붙는 주말 색 모디파이어. 일요일은 빨강, 토요일은 파랑 */
export function weekendMod(block: string, dow: number): string {
  if (dow === 0) return `${block}--sun`;
  if (dow === 6) return `${block}--sat`;
  return '';
}
