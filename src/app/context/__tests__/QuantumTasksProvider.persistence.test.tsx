import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QuantumTasksProvider } from '@/app/context/QuantumTasksProvider';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    invalidateQuantumTasksDiskWarmCache,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { legalTaskStub as task } from '@/app/services/tasks/__tests__/legalTaskStub';
import { notifyBootContentReady } from '@/app/bootstrap/bootReveal';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

vi.mock('@/app/services/SecureStoreService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/SecureStoreService')>();
    return {
        default: {
            ...actual.default,
            ensurePersistedReady: vi.fn(async () => undefined),
            setItemSync: vi.fn(),
            setItem: vi.fn(async () => undefined),
            getItemSync: vi.fn(() => null),
            getItem: vi.fn(async () => null),
        },
    };
});

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async () => null),
        primeEntry: vi.fn(),
        save: vi.fn(),
    },
}));

vi.mock('@/app/services/dossierPersistence/dossierBackupStore', () => ({
    readLatestDossierBackup: vi.fn(async () => null),
    writeDossierBackup: vi.fn(async () => undefined),
}));

function wrapper({ children }: { children: React.ReactNode }) {
    return <QuantumTasksProvider>{children}</QuantumTasksProvider>;
}

describe('QuantumTasksProvider persistence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        invalidateQuantumTasksDiskWarmCache();
        notifyBootContentReady();
    });

    it('mirrors committed tasks to SecureStore after hydration', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const { result } = renderHook(
            () => ({
                data: useQuantumTasksData(),
                actions: useQuantumTasksActions(),
            }),
            { wrapper },
        );

        await waitFor(() => {
            expect(result.current.data.storageHydrated).toBe(true);
        });

        act(() => {
            result.current.actions.addWeeklyLocationBundle(new Date(2026, 5, 21), 'بغداد', 'جلسة');
        });

        await waitFor(() => {
            const payloads = vi.mocked(SecureStoreService.setItemSync).mock.calls.map((c) => String(c[1]));
            expect(payloads.some((raw) => raw.includes('بغداد') && raw.includes('جلسة'))).toBe(true);
        });
        expect(localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)).toBeNull();
    });

    it('§29: لا يستدعي SecureStore sync عند أول mount قبل hydrate', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const getItemSync = SecureStoreService.getItemSync as ReturnType<typeof vi.fn>;
        const setItemSync = SecureStoreService.setItemSync as ReturnType<typeof vi.fn>;

        const { result } = renderHook(() => useQuantumTasksData(), { wrapper });

        expect(getItemSync).not.toHaveBeenCalled();
        expect(setItemSync).not.toHaveBeenCalled();
        expect(result.current.storageHydrated).toBe(true);

        await waitFor(() => {
            expect(result.current.storageHydrated).toBe(true);
        });

        expect(getItemSync).not.toHaveBeenCalled();
    });

    it('بعد hydrate يرحّل leftover localStorage إلى SecureStore ويمحوه', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const leftover = serializeQuantumTasks([
            task({
                id: 'legacy-hydrate',
                title: 'تراثي بعد الإقلاع',
                location: 'الكرخ',
                parsedDate: new Date(),
            }),
        ]);
        localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, JSON.stringify(leftover));

        const { result } = renderHook(() => useQuantumTasksData(), { wrapper });

        expect(SecureStoreService.setItemSync).not.toHaveBeenCalled();
        expect(result.current.tasks.some((t) => t.id === 'legacy-hydrate')).toBe(true);

        await waitFor(() => {
            expect(localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)).toBeNull();
        });
        const payloads = vi.mocked(SecureStoreService.setItemSync).mock.calls.map((c) => String(c[1]));
        expect(payloads.some((raw) => raw.includes('legacy-hydrate'))).toBe(true);
    });

    it('مع أصل من القرص يمحو leftover دون الكتابة فوقه', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const agendaDay = new Date();
        const diskBlob = serializeQuantumTasks([
            task({
                id: 'disk-origin',
                title: 'من القرص',
                location: 'الرصافة',
                parsedDate: agendaDay,
            }),
        ]);
        const leftover = serializeQuantumTasks([
            task({
                id: 'disk-origin',
                title: 'مرآة قديمة',
                location: 'الكرخ',
                parsedDate: agendaDay,
            }),
        ]);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValueOnce(diskBlob);
        localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, JSON.stringify(leftover));

        renderHook(() => useQuantumTasksData(), { wrapper });

        await waitFor(() => {
            expect(localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)).toBeNull();
        });
        expect(vi.mocked(SecureStoreService.setItemSync)).not.toHaveBeenCalled();
    });
});
