import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    RepositoryDB,
    type CommunityPost,
} from '@/app/services/lawyer-cloud';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { RepositoryDocument, SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { Transaction, TransactionTask } from '@/app/modules/transactionsThreading/types';
import { fetchCommunityPosts } from '@/app/services/forum/communityCloudLoader';
import { invalidateGlobalSearchFuseCache } from '@/app/services/globalSearchFuse';
import { invalidateGlobalSearchIndexCache } from '@/app/services/globalSearchIndexRuntime';
import { invalidateProfileLineCache } from '@/app/services/globalSearchProfileCache';
import { invalidateFileSearchSliceCache } from '@/app/services/search/globalSearchFileSliceCache';
import { resetGlobalSearchWarmState } from '@/app/services/globalSearchWarmState';
import {
    clearCachedGlobalSearchExtras,
    emptyGlobalSearchExtras,
    getCachedGlobalSearchExtras,
    peekGlobalSearchExtrasCacheUserId,
    setCachedGlobalSearchExtras,
    type GlobalSearchExtras,
    type GlobalSearchExtrasLoadOptions,
} from '@/app/services/globalSearchExtrasCache';

export type { GlobalSearchExtras, GlobalSearchExtrasLoadOptions };
export { emptyGlobalSearchExtras, getCachedGlobalSearchExtras };

function shouldIncludeCommunityPosts(options?: GlobalSearchExtrasLoadOptions): boolean {
    return options?.includeCommunityPosts !== false;
}

let inflightExtras: {
    userId: string;
    includeCommunityPosts: boolean;
    promise: Promise<GlobalSearchExtras>;
} | null = null;

export function invalidateGlobalSearchExtrasCache(userId?: string | null): void {
    const cachedUser = peekGlobalSearchExtrasCacheUserId();
    if (userId && cachedUser != null && cachedUser !== userId) return;
    clearCachedGlobalSearchExtras(userId);
    if (!userId || inflightExtras?.userId === userId) inflightExtras = null;
    invalidateGlobalSearchIndexCache();
    invalidateGlobalSearchFuseCache();
    invalidateFileSearchSliceCache();
    invalidateProfileLineCache(userId ?? undefined);
    resetGlobalSearchWarmState();
}

/** تسخين مصادر البحث في الخلفية — لا يُعيد التحميل إذا كان الكاش سارياً. */
export function warmGlobalSearchExtras(userId: string | null): void {
    if (!userId) return;
    void loadGlobalSearchExtras(userId, { includeCommunityPosts: false }).catch(() => {
        /* تسخين اختياري */
    });
}

async function fetchGlobalSearchExtras(
    userId: string,
    options?: GlobalSearchExtrasLoadOptions,
): Promise<GlobalSearchExtras> {
    const includeCommunityPosts = shouldIncludeCommunityPosts(options);
    const [
        { UrgentActionsDB },
        { persistenceRepository },
        { QUANTUM_TASKS_STORAGE_KEY, deserializeQuantumTasks },
        { fetchCalendarEvents },
        { fetchTransactionsThreadingState },
    ] = await Promise.all([
        import('@/app/services/urgent-actions-db'),
        import('@/app/infrastructure/persistence/LocalStorageRepository'),
        import('@/app/utils/quantumTasksStorage'),
        import('@/app/services/calendar/calendarCloudLoader'),
        import('@/app/services/transactions/transactionsCloudLoader'),
    ]);

    const [calendarEvents, vaultDocs, repositoryDocs, urgentState, threadingState, communityPosts] =
        await Promise.all([
            fetchCalendarEvents(userId).catch(() => [] as CalendarEvent[]),
            SmartVaultDB.listDocs(userId).catch(() => [] as SmartVaultDoc[]),
            RepositoryDB.listDocuments().catch(() => [] as RepositoryDocument[]),
            UrgentActionsDB.getState(userId).catch(() => null),
            fetchTransactionsThreadingState(userId).catch(() => null),
            includeCommunityPosts
                ? fetchCommunityPosts().catch(() => [] as CommunityPost[])
                : Promise.resolve([] as CommunityPost[]),
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
        communityPosts,
    };
}

/** تحميل مصادر البحث غير المتزامنة من كل أقسام التطبيق — مع كاش جلسة لكل مستخدم. */
export async function loadGlobalSearchExtras(
    userId: string | null,
    options?: GlobalSearchExtrasLoadOptions,
): Promise<GlobalSearchExtras> {
    if (!userId) return emptyGlobalSearchExtras();
    const includeCommunityPosts = shouldIncludeCommunityPosts(options);

    const cached = getCachedGlobalSearchExtras(
        userId,
        includeCommunityPosts ? { includeCommunityPosts: true } : undefined,
    );
    if (cached) return cached;

    if (
        inflightExtras?.userId === userId &&
        (inflightExtras.includeCommunityPosts || !includeCommunityPosts)
    ) {
        return inflightExtras.promise;
    }

    const promise = fetchGlobalSearchExtras(userId, options)
        .then((data) => {
            setCachedGlobalSearchExtras(userId, data, includeCommunityPosts);
            return data;
        })
        .finally(() => {
            if (
                inflightExtras?.userId === userId &&
                inflightExtras.includeCommunityPosts === includeCommunityPosts
            ) {
                inflightExtras = null;
            }
        });

    inflightExtras = { userId, includeCommunityPosts, promise };
    return promise;
}
