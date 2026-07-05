import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QuantumTasksProvider } from '@/app/context/QuantumTasksProvider';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorage';

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
    });

    it('mirrors committed tasks to localStorage after hydration', async () => {
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
            const raw = localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY);
            expect(raw).toContain('بغداد');
            expect(raw).toContain('جلسة');
        });
    });
});
