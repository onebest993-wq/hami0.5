import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import type { RepositoryDocument, SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { Transaction, TransactionTask } from '@/app/modules/transactionsThreading/types';

export type GlobalSearchExtras = {
    quantumTasks: LegalTask[];
    calendarEvents: CalendarEvent[];
    urgentCases: unknown[];
    vaultDocs: SmartVaultDoc[];
    repositoryDocs: RepositoryDocument[];
    threadingTransactions: Transaction[];
    threadingTasks: TransactionTask[];
    communityPosts: CommunityPost[];
};

export type GlobalSearchExtrasLoadOptions = {
    includeCommunityPosts?: boolean;
};

type ResolvedExtrasCache = {
    userId: string;
    data: GlobalSearchExtras;
    includeCommunityPosts: boolean;
};

let resolvedExtrasCache: ResolvedExtrasCache | null = null;

export function emptyGlobalSearchExtras(): GlobalSearchExtras {
    return {
        quantumTasks: [],
        calendarEvents: [],
        urgentCases: [],
        vaultDocs: [],
        repositoryDocs: [],
        threadingTransactions: [],
        threadingTasks: [],
        communityPosts: [],
    };
}

function shouldRequireCommunityPosts(options?: GlobalSearchExtrasLoadOptions): boolean {
    return options?.includeCommunityPosts === true;
}

/** peek كاش الجلسة فقط — بلا cloud / vault. */
export function getCachedGlobalSearchExtras(
    userId: string | null,
    options?: GlobalSearchExtrasLoadOptions,
): GlobalSearchExtras | null {
    if (!userId || resolvedExtrasCache?.userId !== userId) return null;
    if (shouldRequireCommunityPosts(options) && !resolvedExtrasCache.includeCommunityPosts) return null;
    return resolvedExtrasCache.data;
}

export function setCachedGlobalSearchExtras(
    userId: string,
    data: GlobalSearchExtras,
    includeCommunityPosts: boolean,
): void {
    resolvedExtrasCache = { userId, data, includeCommunityPosts };
}

export function clearCachedGlobalSearchExtras(userId?: string | null): void {
    if (userId && resolvedExtrasCache?.userId != null && resolvedExtrasCache.userId !== userId) return;
    resolvedExtrasCache = null;
}

export function peekGlobalSearchExtrasCacheUserId(): string | null {
    return resolvedExtrasCache?.userId ?? null;
}
