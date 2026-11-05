export interface Subtask { id: string; text: string; completed: boolean; }

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

// 업무 종류. 주간보고에서 줄 모양이 달라진다.
// task: 일반 업무([카테고리] 내용) / routine: 정기 업무(날짜 + 내용 완료) / leave: 연차·휴가(날짜 + 내용)
export type TodoKind = 'task' | 'routine' | 'leave';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  createdAt: string;
  subtasks?: Subtask[];
  pinned?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'; // @deprecated 반복 시리즈(RecurrenceSeries)로 대체됨. 레거시 데이터 마이그레이션 용도로만 유지.
  memoIds?: string[];
  subtasksCollapsed?: boolean; // 기본값 false (펼침). 하위 항목 없는 Todo는 의미 없음.
  sourceId?: string; // @deprecated 레거시 반복 체인 연결. 마이그레이션 후 seriesId로 대체됨.
  recurrenceGenerated?: boolean; // @deprecated 레거시 반복 생성 이력 플래그.
  seriesId?: string; // 이 할 일이 속한 반복 시리즈(RecurrenceSeries) id. 있으면 시리즈가 생성한 회차.
  completedAt?: string; // 실제로 완료 체크한 시각 (재완료 시 갱신, 해제 시 초기화됨)
  kind?: TodoKind; // 없으면 'task'로 본다 (옛 데이터 호환)
}

// 카드 편집 폼이 한 번에 수정할 수 있는 필드
export type TodoUpdates = Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'recurrence' | 'memoIds' | 'kind'>>;

// 반복 일정 그 자체를 나타내는 1급 데이터.
// 개별 회차(Todo)는 예정일이 도래하면 이 규칙으로부터 자동 생성되며, seriesId로 여기에 연결된다.
export interface RecurrenceSeries {
  id: string;
  text: string;
  category: string;
  priority: Todo['priority'];
  frequency: RecurrenceFrequency;
  anchorDate: string;            // YYYY-MM-DD. 첫 회차 마감일이자 주기 계산의 기준점.
  subtasksTemplate?: string[];   // 회차마다 복제할 하위 항목 텍스트
  memoIds?: string[];            // 회차마다 이어붙일 연결 메모
  endDate?: string;             // YYYY-MM-DD. 이 날짜 이후로는 회차를 생성하지 않음 (없으면 무기한).
  kind?: TodoKind;               // 회차마다 이어받는 업무 종류 (없으면 'task')
  status: 'active' | 'ended';
  lastMaterializedDate?: string; // 어느 날짜까지 회차 생성을 마쳤는지 커서 (YYYY-MM-DD)
  createdAt: string;
}

export interface CompletionLogEntry {
  id: string;
  text: string;
  category: string;
  priority: Todo['priority'];
  completedAt: string;
  kind?: TodoKind;
  dueDate?: string; // 연차·휴가의 날짜를 보고서에서 되살리기 위해 남긴다
  subtasks?: { text: string; completed: boolean }[];
}

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortKey = 'default' | 'priority' | 'dueDate' | 'manual';
export type DueScope = 'all' | 'today' | 'week' | 'overdue';
