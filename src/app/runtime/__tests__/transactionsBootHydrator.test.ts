import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateTransactionsShellForInstantOpen = vi.fn(() => Promise.resolve(true));
const prefetchTransactionsHubModule = vi.fn();
const warmTransactionsOnHover = vi.fn();

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    hydrateTransactionsShellForInstantOpen: (...args: unknown[]) =>
        hydrateTransactionsShellForInstantOpen(...args),
    isTransactionsHubModuleResolved: vi.fn(() => false),
    prefetchTransactionsHubModule: (...args: unknown[]) => prefetchTransactionsHubModule(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/transactionsIntentWarm', () => ({
    warmTransactionsOnHover: (...args: unknown[]) => warmTransactionsOnHover(...args),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
    isBootRevealDone: vi.fn(() => false),
}));

vi.mock('@/app/runtime/deferredFeatureStyles', () => ({
    ensureDeferredFeatureStylesLoaded: vi.fn(() => Promise.resolve()),
}));

describe('transactionsBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/transactionsBootHydrator');
        mod.resetTransactionsBootHydratorForTests();
        vi.mocked(
            (await import('@/app/runtime/transactionsHubLoader')).isTransactionsHubModuleResolved,
        ).mockReturnValue(false);
        vi.mocked(
            (await import('@/app/services/settings/settingsRuntime')).getLawyerSettingsSnapshot,
        ).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
    });

    it('hydrateTransactionsBootShellForInstantOpen يحمّل shell', async () => {
        const { hydrateTransactionsBootShellForInstantOpen, TRANSACTIONS_SHELL_HYDRATED_EVENT } =
            await import('@/app/runtime/transactionsBootHydrator');

        const onHydrated = vi.fn();
        window.addEventListener(TRANSACTIONS_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateTransactionsBootShellForInstantOpen('lawyer-1', true);

        expect(ok).toBe(true);
        expect(hydrateTransactionsShellForInstantOpen).toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(TRANSACTIONS_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('dispatchTransactionsPrimeHost يطلق حدث تجهيز المضيف', async () => {
        const { dispatchTransactionsPrimeHost, TRANSACTIONS_PRIME_HOST_EVENT } = await import(
            '@/app/runtime/transactionsBootHydrator'
        );
        const onPrime = vi.fn();
        window.addEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
        dispatchTransactionsPrimeHost();
        expect(onPrime).toHaveBeenCalledTimes(1);
        window.removeEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
    });

    it('prefetchTransactionsAfterBootReveal يحمّل الـ hub مرة واحدة', async () => {
        const { prefetchTransactionsAfterBootReveal } = await import(
            '@/app/runtime/transactionsBootHydrator'
        );

        prefetchTransactionsAfterBootReveal('lawyer-1');
        prefetchTransactionsAfterBootReveal('lawyer-1');

        expect(prefetchTransactionsHubModule).toHaveBeenCalled();
    });
});
