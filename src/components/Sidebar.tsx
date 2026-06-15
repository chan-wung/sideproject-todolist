import AppToolbar from './AppToolbar';
import type { Todo } from '../types/todo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exportData: () => Todo[];
  importData: (incoming: unknown) => boolean;
  onImportResult: (success: boolean) => void;
  onOpenMemo: () => void;
}

export default function Sidebar({ isOpen, onClose, exportData, importData, onImportResult, onOpenMemo }: Props) {
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'sidebar-overlay--open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <h2>컨트롤 패널</h2>
          <button className="sidebar__close" onClick={onClose} type="button">&times;</button>
        </div>
        <div className="sidebar__body">
          <AppToolbar exportData={exportData} importData={importData} onImportResult={onImportResult} />
        </div>
      </div>
    </>
  );
}
