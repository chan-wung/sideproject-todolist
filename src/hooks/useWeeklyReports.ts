import { usePersistentState } from './usePersistentState';
import { WEEKLY_REPORTS_KEY } from '../constants/storageKeys';
import { validateWeeklyReportData, type WeeklyReportData } from '../utils/weeklyReportData';


const STORAGE_KEY = WEEKLY_REPORTS_KEY;
const INITIAL_DATA: WeeklyReportData = { drafts: {}, copiedWeeks: [] };


// 주별 수동 편집본과 복사 완료 기록. 자동 생성 보고서와 분리해 저장한다.
export function useWeeklyReports() {
  const [data, setData] = usePersistentState<WeeklyReportData>(STORAGE_KEY, INITIAL_DATA, validateWeeklyReportData);

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
