import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';
import MemoPage from './pages/MemoPage';
import DashboardPage from './pages/DashboardPage';
import TodoInput from './components/TodoInput';
import TodoItem from './components/TodoItem';
import type { ComponentProps } from 'react';

// 역할(role)과 접근 가능한 이름으로 찾는다: placeholder가 아니라 label/aria-label/제목 연결이 있어야 통과한다.
describe('접근 가능한 이름', () => {
  beforeEach(() => {
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); },
      close(this: HTMLDialogElement) { this.removeAttribute('open'); },
    });
  });
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('확인창 dialog는 안내 문구를 이름으로 가진다', () => {
    render(<ConfirmModal message="정말 지울까요?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: '정말 지울까요?' })).toBeTruthy();
  });

  it('설정 dialog는 제목을 이름으로 가진다', () => {
    render(
      <SettingsModal isOpen onClose={vi.fn()} onResetTodos={vi.fn()} onResetMemos={vi.fn()} onResetAll={vi.fn()}
        onResetCompletionLog={vi.fn()} notifyEnabled={false} onToggleNotify={vi.fn()} lastBackup={null} />,
    );
    expect(screen.getByRole('dialog', { name: '설정' })).toBeTruthy();
  });

  it('할 일 입력창의 내용 칸은 이름이 있다', () => {
    render(<TodoInput onAdd={vi.fn()} categories={[]} />);
    expect(screen.getByRole('textbox', { name: '할 일 내용' })).toBeTruthy();
  });

  it('메모 제목·내용 칸은 이름이 있다', () => {
    render(
      <MemoPage memos={[{ id: 'm1', title: '제목', content: '' }]} activeId="m1" todos={[]}
        setMemos={vi.fn()} setActiveId={vi.fn()} onLinkMemo={vi.fn()} onUnlinkMemo={vi.fn()}
        onCopyText={vi.fn()} onShareText={vi.fn()} onKakaoShareText={vi.fn()} />,
    );
    expect(screen.getByRole('textbox', { name: '메모 제목' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '메모 내용' })).toBeTruthy();
  });

  it('할 일 카드의 하위 항목 입력은 이름이 있다', () => {
    const props: ComponentProps<typeof TodoItem> = {
      todo: { id: 't', text: '업무', completed: false, priority: 'medium', category: '기본', createdAt: '2026-07-01T09:00:00' },
      categories: [], memos: [],
      onToggleSelect: vi.fn(), onToggleSubtasksCollapsed: vi.fn(), onToggle: vi.fn(), onDelete: vi.fn(), onPin: vi.fn(),
      onCopy: vi.fn(), onShare: vi.fn(), onKakaoShare: vi.fn(), onDuplicate: vi.fn(), onUpdate: vi.fn(),
      onAddSubtask: vi.fn(), onToggleSubtask: vi.fn(), onDeleteSubtask: vi.fn(), onUpdateSubtask: vi.fn(), onReorderSubtasks: vi.fn(), onOpenMemo: vi.fn(),
    };
    render(<TodoItem {...props} />);
    expect(screen.getByRole('textbox', { name: '새 하위 항목 내용' })).toBeTruthy();
  });

  it('대시보드는 h1 아래 카드 제목이 h2이고 단계를 건너뛰지 않는다', () => {
    render(<DashboardPage todos={[]} completionLog={[]} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });
});
