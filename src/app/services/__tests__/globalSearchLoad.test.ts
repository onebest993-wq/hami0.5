import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listDocuments = vi.hoisted(() => vi.fn());
const fetchCommunityPosts = vi.hoisted(() => vi.fn());
const listDocs = vi.hoisted(() => vi.fn());
const fetchCalendarEvents = vi.hoisted(() => vi.fn());
const getUrgentState = vi.hoisted(() => vi.fn());
const fetchThreading = vi.hoisted(() => vi.fn());
const persistLoad = vi.hoisted(() => vi.fn());
const deserializeQuantumTasks = vi.hoisted(() => vi.fn());

vi.mock('@/app/services/cloud/lawyerRepositoryCloud', () => ({
    RepositoryDB: { listDocuments },
}));
vi.mock('@/app/services/forum/communityCloudLoader', () => ({
    fetchCommunityPosts,
}));
vi.mock('@/app/services/vault/smartVaultRuntime', () => ({
    SmartVaultDB: { listDocs },
}));
vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    fetchCalendarEvents,
}));
vi.mock('@/app/services/urgent-actions-db', () => ({
    UrgentActionsDB: { getState: getUrgentState },
}));
vi.mock('@/app/services/transactions/transactionsCloudLoader', () => ({
    fetchTransactionsThreadingState: fetchThreading,
}));
vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: { load: persistLoad },
}));
vi.mock('@/app/utils/quantumTasksStorage', () => ({
    QUANTUM_TASKS_STORAGE_KEY: 'hami_quantum_legal_tasks_v1',
    deserializeQuantumTasks,
}));

import {
    invalidateGlobalSearchExtrasCache,
    loadGlobalSearchExtras,
} from '@/app/services/globalSearchLoad';

describe('loadGlobalSearchExtras community surface', () => {
    beforeEach(() => {
        invalidateGlobalSearchExtrasCache();
        listDocuments.mockReset().mockResolvedValue([]);
        fetchCommunityPosts.mockReset().mockResolvedValue([]);
        listDocs.mockReset().mockResolvedValue([]);
        fetchCalendarEvents.mockReset().mockResolvedValue([]);
        getUrgentState.mockReset().mockResolvedValue({ cases: [] });
        fetchThreading.mockReset().mockResolvedValue({ transactions: [], tasks: [] });
        persistLoad.mockReset().mockReturnValue(null);
        deserializeQuantumTasks.mockReset().mockReturnValue([]);
    });

    afterEach(() => {
        invalidateGlobalSearchExtrasCache();
    });

    it('التسخين لا يستدعي مستودع المنتدى ولا منشوراته', async () => {
        await loadGlobalSearchExtras('u1', { includeCommunityPosts: false });
        expect(listDocuments).not.toHaveBeenCalled();
        expect(fetchCommunityPosts).not.toHaveBeenCalled();
        expect(fetchCalendarEvents).toHaveBeenCalledWith('u1');
        expect(listDocs).toHaveBeenCalledWith('u1');
    });

    it('فتح الورقة يسحب سطح المجتمع', async () => {
        await loadGlobalSearchExtras('u1', { includeCommunityPosts: true });
        expect(listDocuments).toHaveBeenCalled();
        expect(fetchCommunityPosts).toHaveBeenCalled();
        expect(fetchCalendarEvents).toHaveBeenCalledWith('u1');
    });
});
