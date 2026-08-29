import { beforeEach, describe, expect, it, vi } from 'vitest';

const setCriminalState = vi.fn();
const resetDraft = vi.fn();
const setCriminalPersistOptions = vi.fn();
const resetExecutionStore = vi.fn();
const setExecutionPersistOptions = vi.fn();
const setCaseState = vi.fn();
const setCasePersistOptions = vi.fn();

vi.mock('@/app/components/lawyer/criminal-system/criminalStore', () => ({
    useCriminalStore: {
        persist: { setOptions: setCriminalPersistOptions },
        setState: setCriminalState,
        getState: () => ({ resetDraft }),
    },
}));

vi.mock('@/app/stores/executionDashboardStore', () => ({
    useExecutionDashboardStore: {
        persist: { setOptions: setExecutionPersistOptions },
        getState: () => ({ resetStore: resetExecutionStore }),
    },
}));

vi.mock('@/app/stores/caseStore', () => ({
    useCaseStore: {
        persist: { setOptions: setCasePersistOptions },
        setState: setCaseState,
    },
}));

describe('mutePersistedStoresForApplicationWipe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يوقف إعادة الكتابة ويفرّغ متاجر الذاكرة', async () => {
        const { mutePersistedStoresForApplicationWipe } = await import(
            '@/app/services/settings/mutePersistedStoresForWipe'
        );
        await mutePersistedStoresForApplicationWipe();

        expect(setCriminalPersistOptions).toHaveBeenCalled();
        expect(setCriminalState).toHaveBeenCalled();
        expect(resetDraft).toHaveBeenCalled();
        expect(setExecutionPersistOptions).toHaveBeenCalled();
        expect(resetExecutionStore).toHaveBeenCalled();
        expect(setCasePersistOptions).toHaveBeenCalled();
        expect(setCaseState).toHaveBeenCalledWith({ cases: [], selectedCaseId: null });
    });
});
