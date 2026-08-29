import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const save = vi.fn();
const flushPending = vi.fn();
const getItem = vi.fn<() => Promise<string | null>>();
const getItemSync = vi.fn<() => string | null>();
const flushHeavyPersistPending = vi.fn();

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        save: (...args: unknown[]) => save(...args),
        flushPending: (...args: unknown[]) => flushPending(...args),
    },
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: (...args: unknown[]) => getItem(...args),
        getItemSync: (...args: unknown[]) => getItemSync(...args),
        isUnreadSync: () => false,
        flushHeavyPersistPending: (...args: unknown[]) => flushHeavyPersistPending(...args),
    },
}));

import { useAutoSave } from '@/app/hooks/useAutoSave';

describe('useAutoSave settings data-integrity lifecycle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        getItem.mockResolvedValue(null);
        getItemSync.mockReturnValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('flushes the last enabled value when auto-save is disabled', async () => {
        const { rerender } = renderHook(
            ({ enabled }) => useAutoSave('globalNotes', [{ id: 1 }], 2_000, enabled, true),
            { initialProps: { enabled: true } },
        );

        rerender({ enabled: false });

        expect(save).toHaveBeenCalledWith('globalNotes', [{ id: 1 }]);
        expect(flushPending).toHaveBeenCalledWith('globalNotes');
    });

    it('does not overwrite a just-imported value with stale React state', async () => {
        getItemSync.mockReturnValue('[{"id":2}]');
        renderHook(() => useAutoSave('globalNotes', [{ id: 1 }], 10, true, true));

        act(() => {
            window.dispatchEvent(
                new CustomEvent('hami:data-imported', {
                    detail: { keys: ['globalNotes'] },
                }),
            );
            window.dispatchEvent(new PageTransitionEvent('pagehide'));
            vi.advanceTimersByTime(20);
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('does not recreate defaults after a full local-data clear', async () => {
        const { rerender } = renderHook(
            ({ data }) => useAutoSave('globalNotes', data, 10, true, true),
            { initialProps: { data: [{ id: 1 }] } },
        );

        act(() => {
            window.dispatchEvent(new Event('hami:data-cleared'));
        });
        rerender({ data: [] });
        act(() => {
            vi.advanceTimersByTime(20);
            window.dispatchEvent(new PageTransitionEvent('pagehide'));
        });

        expect(save).not.toHaveBeenCalled();
    });
});
