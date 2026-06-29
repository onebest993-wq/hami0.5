import type { LegalCase } from '@/app/stores/caseStore';
import type { GlobalSearchExtras } from '@/app/services/globalSearchLoad';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';

export { buildGlobalSearchIndex } from '@/app/services/search/globalSearchIndexPure';
export { invalidateFileSearchSliceCache } from '@/app/services/search/globalSearchFileSliceCache';

export type GlobalSearchCategory =
    | 'lawsuit'
    | 'transaction'
    | 'execution'
    | 'criminal'
    | 'note'
    | 'voice'
    | 'vault'
    | 'repository'
    | 'case'
    | 'party'
    | 'profile'
    | 'task'
    | 'calendar'
    | 'urgent'
    | 'threading'
    | 'finance'
    | 'community'
    | 'notification';

export type GlobalSearchNavigate =
    | {
          type: 'file';
          fileId: string | number;
          stageIndex?: number;
          eventId?: string;
      }
    | { type: 'criminal'; criminalId: string }
    | { type: 'note'; noteId?: string }
    | { type: 'voice'; noteId?: string }
    | { type: 'vault' }
    | { type: 'repository' }
    | { type: 'case'; caseId: string }
    | { type: 'profile' }
    | { type: 'tasks_manager'; taskId?: string }
    | { type: 'calendar'; eventId?: string; date?: string }
    | { type: 'urgent'; urgentId?: string }
    | { type: 'transactions'; transactionId?: string }
    | { type: 'community'; postId?: string }
    | { type: 'notifications' };

export type GlobalSearchEntry = {
    id: string;
    category: GlobalSearchCategory;
    title: string;
    subtitle: string;
    snippet?: string;
    lifecycle: SearchLifecycle;
    _searchStr: string;
    navigate: GlobalSearchNavigate;
};

type GlobalNoteRow = {
    id: number | string;
    title?: string;
    body?: string;
    type?: string;
    transcript?: string;
    voiceDurationSec?: number;
};

export type PreparedVaultNote = { id: string; content: string; type?: 'text' | 'voice' };
export type PreparedDocsVaultDoc = { id: string; name: string; caseId?: string; tags?: string[] };

const ALL_CATEGORIES: GlobalSearchCategory[] = [
    'lawsuit',
    'transaction',
    'execution',
    'criminal',
    'note',
    'voice',
    'vault',
    'repository',
    'case',
    'party',
    'profile',
    'task',
    'calendar',
    'urgent',
    'threading',
    'finance',
    'community',
    'notification',
];

export type BuildGlobalSearchIndexInput = {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: GlobalNoteRow[];
    cases: LegalCase[];
    criminalCases?: unknown[];
    profileLine?: string;
    userId: string | null;
    notifications?: { id: string; title: string; message: string; type: string }[];
    extras?: GlobalSearchExtras;
    preparedVaultNotes?: PreparedVaultNote[];
    preparedDocsVault?: PreparedDocsVaultDoc[];
    preparedStoredNotes?: GlobalNoteRow[];
    cacheGeneration?: number;
    preparedExecutionDeepEntries?: GlobalSearchEntry[];
};

export type GroupedSearchResults = Record<GlobalSearchCategory, GlobalSearchEntry[]> & {
    total: number;
    hasResults: boolean;
};

export function groupSearchResults(entries: GlobalSearchEntry[]): GroupedSearchResults {
    const g = {
        total: entries.length,
        hasResults: entries.length > 0,
    } as GroupedSearchResults;
    for (const c of ALL_CATEGORIES) {
        g[c] = [];
    }
    for (const e of entries) {
        g[e.category].push(e);
    }
    return g;
}

export const SEARCH_CATEGORY_LABELS: Record<GlobalSearchCategory, string> = {
    lawsuit: 'دعاوى قضائية',
    transaction: 'معاملات الملفات',
    execution: 'إضابير تنفيذ',
    criminal: 'قضايا جزائية',
    note: 'ملاحظات',
    voice: 'تسجيلات صوتية',
    vault: 'مخزن الملفات',
    repository: 'المكتبة القانونية',
    case: 'سجل القضايا',
    party: 'موكلون وخصوم',
    profile: 'الملف الشخصي',
    task: 'مهام',
    calendar: 'التقويم',
    urgent: 'طلبات مستعجلة',
    threading: 'نظام المعاملات',
    finance: 'سجلات مالية',
    community: 'مجتمع المحامين',
    notification: 'الإشعارات',
};
