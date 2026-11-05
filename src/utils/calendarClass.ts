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
