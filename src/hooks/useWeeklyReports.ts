import { usePersistentState } from './usePersistentState';

export interface WeeklyReportData {
  drafts: Record<string, string>;
  copiedWeeks: string[];
}

const STORAGE_KEY = 'todolist-weekly-reports';
const INITIAL_DATA: WeeklyReportData = { drafts: {}, copiedWeeks: [] };

function isWeekStart(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateWeeklyReportData(raw: unknown): WeeklyReportData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (!value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts) || !Array.isArray(value.copiedWeeks)) return null;
  const drafts = value.drafts as Record<string, unknown>;
  if (!Object.entries(drafts).every(([week, text]) => isWeekStart(week) && typeof text === 'string')) return null;
  if (!value.copiedWeeks.every(isWeekStart)) return null;
  return { drafts: drafts as Record<string, string>, copiedWeeks: [...new Set(value.copiedWeeks)] };
}

// 주별 수동 편집본과 복사 완료 기록. 자동 생성 보고서와 분리해 저장한다.
export function useWeeklyReports() {
  const [data, setData] = usePersistentState<WeeklyReportData>(STORAGE_KEY, INITIAL_DATA);

  function saveDraft(weekStart: string, text: string, generatedText: string) {
    setData(prev => {
      const drafts = { ...prev.drafts };
      if (text === generatedText) delete drafts[weekStart];
      else drafts[weekStart] = text;
      return { ...prev, drafts };
    });
  }

  function resetDraft(weekStart: string) {
    setData(prev => {
      const drafts = { ...prev.drafts };
      delete drafts[weekStart];
      return { ...prev, drafts };
    });
  }

  function markCopied(weekStart: string) {
    setData(prev => prev.copiedWeeks.includes(weekStart) ? prev : { ...prev, copiedWeeks: [...prev.copiedWeeks, weekStart] });
  }

  return {
    data,
    saveDraft,
    resetDraft,
    markCopied,
    importData: (incoming: WeeklyReportData) => setData(incoming),
    reset: () => setData(INITIAL_DATA),
  };
}
