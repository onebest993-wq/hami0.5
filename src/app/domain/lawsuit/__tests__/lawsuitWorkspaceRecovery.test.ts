import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import { resetLawsuitCommitSchedulerForTests } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { clearLawsuitPendingCreatesForTests } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { LAWSUIT_WRITE_JOURNAL_KEY } from '@/app/domain/lawsuit/lawsuitWriteJournal';

vi.mock('@/app/utils/lawsuitFilesStorage', () => ({
    loadLawsuitFilesRaw: vi.fn(() => []),
    saveLawsuitFilesRaw: vi.fn(),
}));

vi.mock('@/app/services/dossierPersistence/dossierBackupStore', () => ({
    listDossierBackups: vi.fn(async () => []),
    readLatestDossierBackup: vi.fn(async () => null),
}));

vi.mock('@/app/services/cloudSyncEngine', () => ({
    performCloudSyncBucket: vi.fn(async () => ({ ok: true, skipped: true })),
}));

vi.mock('@/app/services/cloud/workCloudCheckpoint', () => ({
    restoreLastWorkCloudCheckpoint: vi.fn(async () => ({
        applied: false,
        lawsuits: 0,
        execution: 0,
        notes: 0,
    })),
}));

const file = (id: number): FileData => ({
    id,
    type: 'lawsuit',
    status: 'active',
    caseNo: `2026/ب/${id}`,
    court: 'أحوال',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('recoverLawsuitWorkspaceFromLocalDisk', () => {
    beforeEach(async () => {
        resetLawsuitCommitSchedulerForTests();
        try {
            localStorage.removeItem(LAWSUIT_WRITE_JOURNAL_KEY);
            clearLawsuitPendingCreatesForTests();
        } catch {
            /* ignore */
        }
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        vi.clearAllMocks();
        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([]);
        const { listDossierBackups } = await import(
            '@/app/services/dossierPersistence/dossierBackupStore'
        );
        vi.mocked(listDossierBackups).mockResolvedValue([]);
    });

    it('never throws and reports empty diagnosis', async () => {
        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        const result = await recoverLawsuitWorkspaceFromLocalDisk();
        expect(result.ok).toBe(false);
        expect(result.source).toBe('none');
        expect(result.message.length).toBeGreaterThan(10);
    });

    it('recovers from monolithic when segments empty', async () => {
        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([file(42)]);

        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        const result = await recoverLawsuitWorkspaceFromLocalDisk();
        expect(result.ok).toBe(true);
        expect(['monolithic', 'active']).toContain(result.source);
        expect(result.segments.active.some((f) => String(f.id) === '42')).toBe(true);
    });

    it('recovers from dossier backup list', async () => {
        const { listDossierBackups } = await import(
            '@/app/services/dossierPersistence/dossierBackupStore'
        );
        vi.mocked(listDossierBackups).mockResolvedValue([
            {
                meta: {
                    domain: 'lawsuit',
                    revision: 3,
                    savedAt: new Date().toISOString(),
                    itemCount: 1,
                },
                payload: [file(99)],
            },
        ]);

        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        const result = await recoverLawsuitWorkspaceFromLocalDisk();
        expect(result.ok).toBe(true);
        expect(result.source).toBe('backup');
        expect(result.segments.active.some((f) => String(f.id) === '99')).toBe(true);
    });

    it('includeCloud:false لا يستدعي المزامنة على مسار فتح المخزن', async () => {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        const { restoreLastWorkCloudCheckpoint } = await import(
            '@/app/services/cloud/workCloudCheckpoint'
        );
        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        await recoverLawsuitWorkspaceFromLocalDisk({
            includeCloud: false,
            fullPersistReady: false,
        });
        expect(performCloudSyncBucket).not.toHaveBeenCalled();
        expect(restoreLastWorkCloudCheckpoint).not.toHaveBeenCalled();
    });

    it('includeCloud الافتراضي يحاول استعادة نقطة العمل قبل مزامنة السلة', async () => {
        const { restoreLastWorkCloudCheckpoint } = await import(
            '@/app/services/cloud/workCloudCheckpoint'
        );
        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        await recoverLawsuitWorkspaceFromLocalDisk({ fullPersistReady: false });
        expect(restoreLastWorkCloudCheckpoint).toHaveBeenCalled();
    });

    it('يمحو leftover الدعاوى من localStorage عند الاستعادة', async () => {
        const { LAWSUIT_FILES_STORAGE_KEY } = await import(
            '@/app/services/dossierPersistence/dossierStorageKeys'
        );
        localStorage.setItem(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify([file(7)]));
        const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
            '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
        );
        await recoverLawsuitWorkspaceFromLocalDisk({ includeCloud: false });
        expect(localStorage.getItem(LAWSUIT_FILES_STORAGE_KEY)).toBeNull();
    });
});
