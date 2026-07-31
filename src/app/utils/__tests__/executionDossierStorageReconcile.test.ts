import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { reconcileExecutionDossierStorage } from '@/app/utils/executionDossierStorageReconcile';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { markExecutionDossierTombstone } from '@/app/utils/executionDossierTombstones';

const EXEC_ID = 'exec_reconcile_test';

describe('executionDossierStorageReconcile', () => {
    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
    });

    it('syncs index from newer blob when diverged', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: EXEC_ID,
                    fileNumber: '300',
                    directorate: 'فهرس قديم',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );
        SecureStoreService.setItemSync(
            executionStorageKey(EXEC_ID),
            JSON.stringify({
                id: EXEC_ID,
                fileNumber: '300',
                directorate: 'بلوب حيّ',
                timelineEvents: [{ id: 'ev-1', title: 'حدث من البلوب' }],
                updatedAt: '2026-06-25T12:00:00.000Z',
            }),
        );

        const result = reconcileExecutionDossierStorage();
        expect(result.indexRowsHealed).toBe(1);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ directorate?: string; timelineEvents?: unknown[] }>;
        const row = index.find((r) => (r as { id?: string }).id === EXEC_ID);
        expect(row?.directorate).toBe('بلوب حيّ');
        expect(row?.timelineEvents).toHaveLength(1);
    });

    it('seeds missing blob from index row', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: EXEC_ID,
                    fileNumber: '400',
                    directorate: 'مديرية من الفهرس',
                    debtors: [{ name: 'مدين' }],
                    updatedAt: '2026-06-20T10:00:00.000Z',
                },
            ]),
        );

        const result = reconcileExecutionDossierStorage();
        expect(result.blobsHealed).toBe(1);

        const blob = JSON.parse(
            SecureStoreService.getItemSync(executionStorageKey(EXEC_ID)) || '{}',
        ) as { directorate?: string; debtors?: unknown[] };
        expect(blob.directorate).toBe('مديرية من الفهرس');
        expect(blob.debtors).toHaveLength(1);
    });

    it('adds index row when blob exists without index entry', () => {
        SecureStoreService.setItemSync(
            executionStorageKey(EXEC_ID),
            JSON.stringify({
                id: EXEC_ID,
                fileNumber: '500',
                directorate: 'إضبارة يتيمة',
                updatedAt: '2026-06-25T08:00:00.000Z',
            }),
        );

        const result = reconcileExecutionDossierStorage();
        expect(result.indexRowsHealed).toBe(1);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ id?: string; directorate?: string }>;
        expect(index.some((r) => r.id === EXEC_ID && r.directorate === 'إضبارة يتيمة')).toBe(true);
    });

    it('does not resurrect tombstoned orphan blobs into the index', () => {
        markExecutionDossierTombstone(EXEC_ID);
        SecureStoreService.setItemSync(
            executionStorageKey(EXEC_ID),
            JSON.stringify({
                id: EXEC_ID,
                fileNumber: '500',
                directorate: 'محذوفة نهائياً',
                updatedAt: '2026-06-25T08:00:00.000Z',
            }),
        );

        const result = reconcileExecutionDossierStorage();
        expect(result.indexRowsHealed).toBe(0);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ id?: string }>;
        expect(index.some((r) => r.id === EXEC_ID)).toBe(false);
    });

    it('heals index from owner-scoped blob key when legacy is empty', () => {
        const scopedKey = `${executionStorageKey(EXEC_ID)}:u:e2e-owner-1`;
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: EXEC_ID,
                    fileNumber: '300',
                    directorate: 'فهرس قديم',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );
        SecureStoreService.setItemSync(
            scopedKey,
            JSON.stringify({
                id: EXEC_ID,
                fileNumber: '300',
                directorate: 'بلوب مقيّد بالمالك',
                timelineEvents: [{ id: 'ev-scoped', title: 'حدث scoped' }],
                updatedAt: '2026-06-25T12:00:00.000Z',
            }),
        );

        const result = reconcileExecutionDossierStorage();
        expect(result.indexRowsHealed).toBe(1);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ directorate?: string; timelineEvents?: unknown[] }>;
        const row = index.find((r) => (r as { id?: string }).id === EXEC_ID);
        expect(row?.directorate).toBe('بلوب مقيّد بالمالك');
        expect(row?.timelineEvents).toHaveLength(1);
    });
});
