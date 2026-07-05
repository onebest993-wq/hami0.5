import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    getCachedArchivePortal,
    loadArchivePortalModule,
    resetHubArchiveModuleCacheForTests,
} from '@/app/runtime/hubArchiveLoader';

vi.mock('@/app/components/lawyer/ArchivePortal.tsx', () => ({
    ArchivePortal: () => null,
}));

describe('hubArchiveLoader', () => {
    beforeEach(() => {
        resetHubArchiveModuleCacheForTests();
        vi.clearAllMocks();
    });

    it('يخزّن ArchivePortal بعد أول تحميل', async () => {
        expect(getCachedArchivePortal()).toBeNull();
        await loadArchivePortalModule();
        expect(getCachedArchivePortal()).not.toBeNull();
    });
});
