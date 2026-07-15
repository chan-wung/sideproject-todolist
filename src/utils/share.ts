import type { Todo, CompletionLogEntry } from '../types/todo';
import type { Memo } from '../hooks/useMemos';

export type ShareResult = 'shared' | 'copied' | 'failed' | 'canceled';

// 제목 + 하위 항목만 깔끔하게. 완료한 항목에만 ✔를 붙인다 (빈 체크박스 문자는 알아보기 어려움).
export function todoToText(todo: Todo): string {
  const lines: string[] = [`${todo.text}${todo.completed ? ' ✔' : ''}`];
  for (const sub of todo.subtasks ?? []) {
    lines.push(`- ${sub.text}${sub.completed ? ' ✔' : ''}`);
  }
  return lines.join('\n');
}

export function memoToText(memo: Memo): string {
  const title = memo.title.trim();
  const content = memo.content.trim();
  if (!title) return content;
  if (!content) return title;
  return `${title}\n\n${content}`;
}

// 완료 이력에 남는 항목은 로그에 기록되는 시점에 하위 항목이 항상 전부 완료 상태이므로 ✔ 표시는 생략한다.
export function completionLogEntryToText(entry: CompletionLogEntry): string {
  const lines: string[] = [entry.text];
  for (const sub of entry.subtasks ?? []) {
    lines.push(`- ${sub.text}`);
  }
  return lines.join('\n');
}

export function completionLogEntriesToText(entries: CompletionLogEntry[]): string {
  return entries.map(completionLogEntryToText).join('\n\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한 거부 등 — 아래 레거시 방식으로 폴백
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Web Share API 미지원(주로 데스크톱) 환경에서는 클립보드 복사로 폴백한다.
export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'canceled';
      // NotAllowedError 등은 클립보드 복사로 폴백
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
