import { beforeEach, describe, expect, it, vi } from 'vitest';

const listKeys = vi.fn(async () => ['executionFiles', 'execution_exec_1', 'execution_exec_1_documents']);
const getItem = vi.fn(async (key: string) => {
    if (key === 'executionFiles') return JSON.stringify([{ id: 'exec_1', createdAt: '2026-01-01T00:00:00.000Z' }]);
    if (key === 'execution_exec_1') return JSON.stringify({ id: 'exec_1', timelineEvents: [] });
    if (key === 'execution_exec_1_documents') return JSON.stringify([]);
    return null;
});

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        listKeys: (...args: unknown[]) => listKeys(...args),
        getItem: (...args: unknown[]) => getItem(...args),
    },
}));

describe('buildBusinessBackupPayload execution blobs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('includes execution dossier blob keys alongside executionFiles index', async () => {
        const { buildBusinessBackupPayload } = await import('@/app/services/settings/businessBackup');
        const result = await buildBusinessBackupPayload({
            includeLawsuits: false,
            includeExecution: true,
            includeNotes: false,
            includeVault: false,
            includeUrgent: false,
            includeUndated: true,
            from: '',
            to: '',
        });

        expect(Object.keys(result.payload.items)).toEqual(
            expect.arrayContaining(['executionFiles', 'execution_exec_1', 'execution_exec_1_documents']),
        );
    });

    it('includes owner-scoped execution index keys', async () => {
        listKeys.mockResolvedValueOnce(['executionFiles:user-1', 'execution_exec_1']);
        getItem.mockImplementation(async (key: string) => {
            if (key === 'executionFiles:user-1') {
                return JSON.stringify([{ id: 'exec_1', createdAt: '2026-01-01T00:00:00.000Z' }]);
            }
            if (key === 'execution_exec_1') return JSON.stringify({ id: 'exec_1' });
            return null;
        });

        const { buildBusinessBackupPayload } = await import('@/app/services/settings/businessBackup');
        const result = await buildBusinessBackupPayload({
            includeLawsuits: false,
            includeExecution: true,
            includeNotes: false,
            includeVault: false,
            includeUrgent: false,
            includeUndated: true,
            from: '',
            to: '',
        });

        expect(Object.keys(result.payload.items)).toEqual(
            expect.arrayContaining(['executionFiles:user-1', 'execution_exec_1']),
        );
        expect(result.counts.execution.items).toBe(1);
    });
});
