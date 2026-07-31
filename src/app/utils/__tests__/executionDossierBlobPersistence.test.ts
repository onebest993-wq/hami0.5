import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import {
    isExecutionDossierMainBlobKey,
    persistExecutionDossierBlob,
    readExecutionDossierBlob,
    shouldRejectExecutionDossierBlobWipe,
    syncExecutionFileInIndex,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionStorageKey, unscopedExecutionStorageKey } from '@/app/utils/executionStorageKeys';
import { scopeExecutionDeviceStorageKey } from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

describe('executionDossierBlobPersistence', () => {
    const execId = 'exec_persist_test_1';
    const blobKey = executionStorageKey(execId);

    beforeEach(() => {
        vi.restoreAllMocks();
        setLiveAuthUserId(null);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
    });

    it('detects main dossier blob keys', () => {
        expect(isExecutionDossierMainBlobKey(blobKey)).toBe(true);
        expect(isExecutionDossierMainBlobKey('executionFiles')).toBe(false);
        expect(isExecutionDossierMainBlobKey(`${blobKey}_decisions`)).toBe(false);
        expect(isExecutionDossierMainBlobKey(`${blobKey}_decisions_ns_financial`)).toBe(false);
    });

    it('rejects wiping a rich dossier blob with an empty object', () => {
        const existing = JSON.stringify({
            id: execId,
            timelineEvents: [{ id: 't1', title: 'حدث' }],
            debtors: [{ name: 'مدين' }],
            creditors: [{ name: 'دائن' }],
        });
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, '{}', existing)).toBe(true);
    });

    it('persists blob and syncs executionFiles index', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([{ id: execId, fileNumber: '100', debtors: [{ name: 'قديم' }] }]),
        );

        const ok = persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: '100',
            debtors: [{ name: 'مدين' }],
            timelineEvents: [{ id: 'ev-1', title: 'جلسة' }],
            updatedAt: '2026-06-25T12:00:00.000Z',
        });

        expect(ok).toBe(true);
        const storedBlob = JSON.parse(SecureStoreService.getItemSync(blobKey) || '{}') as {
            timelineEvents?: unknown[];
        };
        expect(storedBlob.timelineEvents).toHaveLength(1);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ id?: string; timelineEvents?: unknown[] }>;
        const row = index.find((r) => r.id === execId);
        expect(row?.timelineEvents).toHaveLength(1);
    });

    it('syncExecutionFileInIndex merges without dropping trash markers', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: execId,
                    executionTrashDeletedAt: '2026-06-01',
                    debtor_absence_badge_dismissed: true,
                },
            ]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '55',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        const row = index.find((r) => r.id === execId);
        expect(row?.fileNumber).toBe('55');
        expect(row?.executionTrashDeletedAt).toBe('2026-06-01');
        expect(row?.debtor_absence_badge_dismissed).toBe(true);
    });

    it('syncExecutionFileInIndex merges without dropping archive markers', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: execId,
                    executionArchivedAt: '2026-06-10',
                },
            ]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '77',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        const row = index.find((r) => r.id === execId);
        expect(row?.fileNumber).toBe('77');
        expect(row?.executionArchivedAt).toBe('2026-06-10');
    });

    it('syncExecutionFileInIndex skips tombstoned dossiers', () => {
        SecureStoreService.setItemSync(
            'hami:execution:dossier-tombstones:v1',
            JSON.stringify([execId]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '999',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        expect(index.some((r) => r.id === execId)).toBe(false);
    });

    it('reads legacy unscoped blob when scoped key is missing', () => {
        const legacyKey = unscopedExecutionStorageKey(execId);
        SecureStoreService.setItemSync(
            legacyKey,
            JSON.stringify({
                id: execId,
                fileNumber: 'legacy-read',
                timelineEvents: [{ id: 't-legacy', title: 'قديم' }],
            }),
        );

        setLiveAuthUserId('scoped-user');
        const scopedKey = scopeExecutionDeviceStorageKey(legacyKey);
        expect(scopedKey).not.toBe(legacyKey);
        expect(SecureStoreService.getItemSync(scopedKey)).toBeNull();

        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('legacy-read');
        expect(Array.isArray(blob?.timelineEvents)).toBe(true);
    });

    it('writes main blob to owner-scoped key when user is live', () => {
        setLiveAuthUserId('scoped-user');
        const legacyKey = unscopedExecutionStorageKey(execId);
        const scopedKey = scopeExecutionDeviceStorageKey(legacyKey);

        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'scoped-write',
            timelineEvents: [],
        });

        expect(SecureStoreService.getItemSync(scopedKey)).toContain('scoped-write');
        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('scoped-write');
    });
});
