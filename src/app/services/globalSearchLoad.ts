import type { CalendarEvent, CommunityPost } from '@/app/services/lawyer-cloud';
import {
    CalendarDB,
    CommunityDB,
    RepositoryDB,
    SmartVaultDB,
    TransactionsThreadingDB,
    type SmartVaultDoc,
} from '@/app/services/lawyer-cloud';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import type { LegalTask } from '@/app/types/TaskEngine';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { QUANTUM_TASKS_STORAGE_KEY, deserializeQuantumTasks } from '@/app/utils/quantumTasksStorage';
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

/** تحميل مصادر البحث غير المتزامنة من كل أقسام التطبيق */
export async function loadGlobalSearchExtras(userId: string | null): Promise<GlobalSearchExtras> {
    if (!userId) return emptyExtras();

    const [calendarEvents, vaultDocs, repositoryDocs, urgentState, threadingState, communityPosts] =
        await Promise.all([
            CalendarDB.getEvents(userId).catch(() => [] as CalendarEvent[]),
            SmartVaultDB.listDocs(userId).catch(() => [] as SmartVaultDoc[]),
            RepositoryDB.listDocuments().catch(() => [] as RepositoryDocument[]),
            UrgentActionsDB.getState(userId).catch(() => null),
            TransactionsThreadingDB.getState(userId).catch(() => null),
            CommunityDB.listPosts().catch(() => [] as CommunityPost[]),
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
