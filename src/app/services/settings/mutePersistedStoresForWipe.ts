/**
 * يوقف إعادة كتابة Zustand على القرص بعد المسح، ثم يفرّغ الذاكرة.
 * حارس المسح يرفض الكتابة الفارغة فوق بيانات موجودة — لذلك نُلغي التخزين أولاً.
 */

const NOOP_STORAGE = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
};

type PersistApi = {
    persist?: {
        setOptions?: (options: { storage: typeof NOOP_STORAGE }) => void;
    };
};

function mutePersist(store: PersistApi | null | undefined): void {
    store?.persist?.setOptions?.({ storage: NOOP_STORAGE });
}

export async function mutePersistedStoresForApplicationWipe(): Promise<void> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
    try {
        const { useCriminalStore } = await import(
            '@/app/components/lawyer/criminal-system/criminalStore'
        );
        mutePersist(useCriminalStore);
        useCriminalStore.setState({
            casesById: {},
            sessionOwnerLawyerId: null,
            pendingSeveranceContext: null,
        });
        useCriminalStore.getState().resetDraft();
    } catch {
        /* المتجر قد لا يكون محمّلاً */
    }

    try {
        const { useExecutionDashboardStore } = await import(
            '@/app/stores/executionDashboardStore'
        );
        mutePersist(useExecutionDashboardStore);
        useExecutionDashboardStore.getState().resetStore();
    } catch {
        /* المتجر قد لا يكون محمّلاً */
    }

    try {
        const { useCaseStore } = await import('@/app/stores/caseStore');
        mutePersist(useCaseStore);
        useCaseStore.setState({ cases: [], selectedCaseId: null });
    } catch {
        /* المتجر قد لا يكون محمّلاً */
    }
}
