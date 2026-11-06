import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import StorageNotice from './StorageNotice';

function setup(props: Partial<React.ComponentProps<typeof StorageNotice>> = {}) {
  const handlers = { onExport: vi.fn(), onRetry: vi.fn(), onDownloadCorrupt: vi.fn(), onDiscardCorrupt: vi.fn() };
  const utils = render(<StorageNotice saveFailed={false} hasCorrupt={false} {...handlers} {...props} />);
  return { ...utils, ...handlers };
}

describe('StorageNotice', () => {
  afterEach(cleanup);

  it('문제가 없으면 아무것도 그리지 않는다', () => {
    const { container } = setup();
    expect(container.firstChild).toBeNull();
  });

  it('저장 실패 안내에서 내보내기·다시 저장을 누를 수 있다', () => {
    const { getByRole, onExport, onRetry } = setup({ saveFailed: true });
    expect(getByRole('alert').textContent).toContain('저장하지 못했습니다');
    fireEvent.click(getByRole('button', { name: '지금 내보내기' }));
    fireEvent.click(getByRole('button', { name: '다시 저장' }));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('손상 데이터 안내에서 원문 내려받기·보관본 지우기를 누를 수 있다', () => {
    const { getByRole, onDownloadCorrupt, onDiscardCorrupt } = setup({ hasCorrupt: true });
    fireEvent.click(getByRole('button', { name: '원문 내려받기' }));
    fireEvent.click(getByRole('button', { name: '보관본 지우기' }));
    expect(onDownloadCorrupt).toHaveBeenCalledTimes(1);
    expect(onDiscardCorrupt).toHaveBeenCalledTimes(1);
  });
});
