import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import type { CommunityPost, RepositoryDocument, SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { Transaction, TransactionTask, FinanceRecord } from '@/app/modules/transactionsThreading/types';

export type GlobalSearchExtras = {
    quantumTasks: LegalTask[];
    calendarEvents: CalendarEvent[];
    urgentCases: unknown[];
    vaultDocs: SmartVaultDoc[];
    repositoryDocs: RepositoryDocument[];
    threadingTransactions: Transaction[];
    threadingTasks: TransactionTask[];
    threadingFinance: FinanceRecord[];
    communityPosts: CommunityPost[];
};

const emptyExtras = (): GlobalSearchExtras => ({
    quantumTasks: [],
    calendarEvents: [],
    urgentCases: [],
    vaultDocs: [],
    repositoryDocs: [],
    threadingTransactions: [],
    threadingTasks: [],
    threadingFinance: [],
    communityPosts: [],
});

let resolvedExtrasCache: { userId: string; data: GlobalSearchExtras } | null = null;
let inflightExtras: { userId: string; promise: Promise<GlobalSearchExtras> } | null = null;

export function getCachedGlobalSearchExtras(userId: string | null): GlobalSearchExtras | null {
    if (!userId || resolvedExtrasCache?.userId !== userId) return null;
    return resolvedExtrasCache.data;
}

export function invalidateGlobalSearchExtrasCache(userId?: string | null): void {
    if (userId && resolvedExtrasCache?.userId !== userId) return;
    resolvedExtrasCache = null;
    if (!userId || inflightExtras?.userId === userId) inflightExtras = null;
    void import('@/app/services/globalSearchIndexRuntime').then((m) => m.invalidateGlobalSearchIndexCache());
    void import('@/app/services/globalSearchFuse').then((m) => m.invalidateGlobalSearchFuseCache());
    void import('@/app/services/search/globalSearchFileSliceCache').then((m) =>
        m.invalidateFileSearchSliceCache(),
    );
    void import('@/app/services/globalSearchProfileCache').then((m) =>
        m.invalidateProfileLineCache(userId ?? undefined),
    );
    void import('@/app/services/globalSearchWarm').then((m) => m.resetGlobalSearchWarmState());
}

/** تسخين مصادر البحث في الخلفية — لا يُعيد التحميل إذا كان الكاش سارياً. */
export function warmGlobalSearchExtras(userId: string | null): void {
    if (!userId) return;
    void loadGlobalSearchExtras(userId).catch(() => {
        /* تسخين اختياري */
    });
}

async function fetchGlobalSearchExtras(userId: string): Promise<GlobalSearchExtras> {
    const [
        { RepositoryDB, SmartVaultDB },
        { UrgentActionsDB },
        { persistenceRepository },
        { QUANTUM_TASKS_STORAGE_KEY, deserializeQuantumTasks },
        { fetchCalendarEvents },
        { fetchTransactionsThreadingState },
        { fetchCommunityPosts },
    ] = await Promise.all([
        import('@/app/services/lawyer-cloud'),
        import('@/app/services/urgent-actions-db'),
        import('@/app/infrastructure/persistence/LocalStorageRepository'),
        import('@/app/utils/quantumTasksStorage'),
        import('@/app/services/calendar/calendarCloudLoader'),
        import('@/app/services/transactions/transactionsCloudLoader'),
        import('@/app/services/forum/communityCloudLoader'),
    ]);

    const [calendarEvents, vaultDocs, repositoryDocs, urgentState, threadingState, communityPosts] =
        await Promise.all([
            fetchCalendarEvents(userId).catch(() => [] as CalendarEvent[]),
            SmartVaultDB.listDocs(userId).catch(() => [] as SmartVaultDoc[]),
            RepositoryDB.listDocuments().catch(() => [] as RepositoryDocument[]),
            UrgentActionsDB.getState(userId).catch(() => null),
            fetchTransactionsThreadingState(userId).catch(() => null),
            fetchCommunityPosts().catch(() => [] as CommunityPost[]),
        ]);

    const quantumBlob = persistenceRepository.load<unknown>(QUANTUM_TASKS_STORAGE_KEY);
    const quantumTasks = deserializeQuantumTasks(quantumBlob);

    return {
        quantumTasks,
        calendarEvents,
        urgentCases: Array.isArray(urgentState?.cases) ? urgentState.cases : [],
        vaultDocs,
        repositoryDocs,
        threadingTransactions: Array.isArray(threadingState?.transactions)
            ? (threadingState.transactions as Transaction[])
            : [],
        threadingTasks: Array.isArray(threadingState?.tasks) ? (threadingState.tasks as TransactionTask[]) : [],
        threadingFinance: Array.isArray(threadingState?.financeRecords)
            ? (threadingState.financeRecords as FinanceRecord[])
            : [],
        communityPosts,
    };
}

/** تحميل مصادر البحث غير المتزامنة من كل أقسام التطبيق — مع كاش جلسة لكل مستخدم. */
export async function loadGlobalSearchExtras(userId: string | null): Promise<GlobalSearchExtras> {
    if (!userId) return emptyExtras();

    const cached = getCachedGlobalSearchExtras(userId);
    if (cached) return cached;

    if (inflightExtras?.userId === userId) return inflightExtras.promise;

    const promise = fetchGlobalSearchExtras(userId)
        .then((data) => {
            resolvedExtrasCache = { userId, data };
            return data;
        })
        .finally(() => {
            if (inflightExtras?.userId === userId) inflightExtras = null;
        });

    inflightExtras = { userId, promise };
    return promise;
}
