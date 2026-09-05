import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const warmForumPostsCache = vi.fn();
const warmForumPostsCacheFromLocal = vi.fn();
const primeCalendarEventsCacheFromPeek = vi.fn(() => false);
const warmCalendarEventsCache = vi.fn(() => Promise.resolve([]));
const hydrateProfileWarmCachePeekSync = vi.fn();
const warmProfileDataCache = vi.fn(() => Promise.resolve(null));
const warmQuantumTasksDiskRead = vi.fn();
const warmRepositoryDocsCache = vi.fn();
const warmRepositoryDataCache = vi.fn(() => Promise.resolve([]));
const startLawsuitFilesEagerHydrate = vi.fn();
const warmTransactionsDiskRead = vi.fn();
const ensureExecutionIndexReady = vi.fn(() => Promise.resolve());
const startExecutionFilesEagerHydrate = vi.fn();
const isSectionBackgroundPrefetchAllowed = vi.fn(() => true);
const getLiveAuthUserId = vi.fn(() => 'lawyer-1');

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    warmForumPostsCache: (...args: unknown[]) => warmForumPostsCache(...args),
    warmForumPostsCacheFromLocal: (...args: unknown[]) => warmForumPostsCacheFromLocal(...args),
}));

vi.mock('@/app/services/calendar/calendarEventsWarm', () => ({
    primeCalendarEventsCacheFromPeek: (...args: unknown[]) => primeCalendarEventsCacheFromPeek(...args),
    warmCalendarEventsCache: (...args: unknown[]) => warmCalendarEventsCache(...args),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: (...args: unknown[]) => hydrateProfileWarmCachePeekSync(...args),
    warmProfileDataCache: (...args: unknown[]) => warmProfileDataCache(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports', () => ({
    warmQuantumTasksDiskRead: (...args: unknown[]) => warmQuantumTasksDiskRead(...args),
}));

vi.mock('@/app/services/forum/repositoryDocsWarmCache', () => ({
    warmRepositoryDocsCache: (...args: unknown[]) => warmRepositoryDocsCache(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/repositoryIntentWarm', () => ({
    warmRepositoryDataCache: (...args: unknown[]) => warmRepositoryDataCache(...args),
}));

vi.mock('@/app/runtime/lawsuitFilesEagerHydrate', () => ({
    startLawsuitFilesEagerHydrate: (...args: unknown[]) => startLawsuitFilesEagerHydrate(...args),
}));

vi.mock('@/app/services/transactions/transactionsDiskWarm', () => ({
    warmTransactionsDiskRead: (...args: unknown[]) => warmTransactionsDiskRead(...args),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        ensureExecutionIndexReady: (...args: unknown[]) => ensureExecutionIndexReady(...args),
    },
}));

vi.mock('@/app/runtime/executionFilesEagerHydrate', () => ({
    startExecutionFilesEagerHydrate: (...args: unknown[]) => startExecutionFilesEagerHydrate(...args),
}));

vi.mock('@/app/runtime/sectionPrefetchPolicy', () => ({
    isSectionBackgroundPrefetchAllowed: (...args: unknown[]) =>
        isSectionBackgroundPrefetchAllowed(...args),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: (...args: unknown[]) => getLiveAuthUserId(...args),
}));

describe('section chunk data warm — البيانات ليست الشيفرة', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isSectionBackgroundPrefetchAllowed.mockReturnValue(true);
        getLiveAuthUserId.mockReturnValue('lawyer-1');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('المنتدى يسخّن كاش المنشورات عند السماح بالشبكة', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('forum');
        expect(warmForumPostsCacheFromLocal).toHaveBeenCalledTimes(1);
        expect(warmForumPostsCache).toHaveBeenCalledTimes(1);
        expect(primeCalendarEventsCacheFromPeek).not.toHaveBeenCalled();
    });

    it('المنتدى يقرأ المحلي بلا شبكة عند localOnly/lite', async () => {
        isSectionBackgroundPrefetchAllowed.mockReturnValue(false);
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('forum');
        expect(warmForumPostsCacheFromLocal).toHaveBeenCalledTimes(1);
        expect(warmForumPostsCache).not.toHaveBeenCalled();
    });

    it('التقويم يملأ peek ثم يسخّن الكاش', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('schedule');
        expect(primeCalendarEventsCacheFromPeek).toHaveBeenCalledWith('lawyer-1');
        expect(warmCalendarEventsCache).toHaveBeenCalledWith('lawyer-1');
    });

    it('التقويم peek فقط بلا شبكة', async () => {
        isSectionBackgroundPrefetchAllowed.mockReturnValue(false);
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('schedule');
        expect(primeCalendarEventsCacheFromPeek).toHaveBeenCalled();
        expect(warmCalendarEventsCache).not.toHaveBeenCalled();
    });

    it('الملف يملأ peek ثم الكاش الدافئ', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('profile');
        expect(hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-1');
        expect(warmProfileDataCache).toHaveBeenCalledWith('lawyer-1');
    });

    it('الميدان يقرأ القرص لا الشبكة', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('fieldTasks');
        expect(warmQuantumTasksDiskRead).toHaveBeenCalledTimes(1);
    });

    it('المستودع يسخّن الفهرس المحلي ثم وثائق المخزن', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('repository');
        expect(warmRepositoryDocsCache).toHaveBeenCalledTimes(1);
        expect(warmRepositoryDataCache).toHaveBeenCalledWith('lawyer-1');
    });

    it('التنفيذ يسخّن الفهرس فقط لا بلوب الإضبارة', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('execution');
        expect(ensureExecutionIndexReady).toHaveBeenCalledTimes(1);
        expect(startExecutionFilesEagerHydrate).toHaveBeenCalledWith('lawyer-1');
        expect(warmForumPostsCache).not.toHaveBeenCalled();
    });

    it('الدعاوى تفك ملفات الدعوى لا مسار الجزائي', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('lawsuit');
        expect(startLawsuitFilesEagerHydrate).toHaveBeenCalledTimes(1);
    });

    it('المعاملات تقرأ القرص لا سلسلة الفتح الكاملة', async () => {
        const { warmSectionData } = await import('@/app/runtime/sectionChunkDataWarm');
        await warmSectionData('transaction');
        expect(warmTransactionsDiskRead).toHaveBeenCalledWith('lawyer-1');
    });
});
