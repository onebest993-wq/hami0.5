import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('transactionsHubLoader', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('hydrateTransactionsShellForInstantOpen يحمّل Entry المعاملات', async () => {
        vi.doMock(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry',
            () => ({
                LawyerDashboardTransactionsOverlayEntry: () => null,
            }),
        );

        const {
            hydrateTransactionsShellForInstantOpen,
            isTransactionsHubModuleResolved,
            resetTransactionsHubModuleCacheForTests,
        } = await import('@/app/runtime/transactionsHubLoader');
        resetTransactionsHubModuleCacheForTests();

        const ok = await hydrateTransactionsShellForInstantOpen();
        expect(ok).toBe(true);
        expect(isTransactionsHubModuleResolved()).toBe(true);
    });
});
