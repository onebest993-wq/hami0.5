import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markExecutionDossierTombstone } from '@/app/utils/executionDossierTombstones';
import {
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

const getExecutionFiles = vi.fn();
const save = vi.fn();
const loadAsync = vi.fn();

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        checkUserAuth: () => Promise.resolve(true),
        getExecutionFiles: () => getExecutionFiles(),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        save: (key: string, value: unknown) => save(key, value),
        loadAsync: (key: string) => loadAsync(key),
        load: () => null,
        remove: () => undefined,
    },
}));

vi.mock('@/app/utils/executionDossierStorageReconcile', () => ({
    reconcileExecutionDossierStorageAsync: () => Promise.resolve(),
}));

/**
 * الدمج في `cloudSyncEngine` يعمل بقاعدة «الأحدث يفوز» وهي لا تعرف الحذف:
 * نسخة السحابة تبقى بعد الحذف المحلي، فتُعاد الإضبارة عند أول مزامنة.
 *
 * كان `filterTombstonedExecutionSyncRows` مكتوباً ومختبَراً لكنه **غير موصول**
 * بالمحرّك — كود ميت يوحي بحماية غير موجودة. هذا الاختبار يحرس الوصل نفسه.
 */
describe('cloud sync does not resurrect permanently deleted dossiers', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        getExecutionFiles.mockReset();
        save.mockReset();
        loadAsync.mockReset();
        loadAsync.mockResolvedValue([]);
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        bindExecutionFilesStorageOwner('lawyer-resurrect-1');
    });

    async function syncExecutionBucket() {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        return performCloudSyncBucket('executionFiles');
    }

    function savedIds(): string[] {
        const call = save.mock.calls.at(-1);
        const rows = (call?.[1] ?? []) as Array<{ id?: string }>;
        return rows.map((r) => String(r?.id ?? ''));
    }

    it('drops the deleted dossier that still exists in the cloud', async () => {
        markExecutionDossierTombstone('dead-dossier');
        getExecutionFiles.mockResolvedValue([
            { id: 'dead-dossier', caseNo: '9/2026', updatedAt: '2026-07-30T00:00:00.000Z' },
            { id: 'live-dossier', caseNo: '10/2026', updatedAt: '2026-07-30T00:00:00.000Z' },
        ]);

        const result = await syncExecutionBucket();

        expect(result.ok).toBe(true);
        expect(savedIds()).toEqual(['live-dossier']);
    });

    it('drops a tombstoned dossier lingering in the local index too', async () => {
        markExecutionDossierTombstone('dead-local');
        getExecutionFiles.mockResolvedValue([]);
        loadAsync.mockResolvedValue([
            { id: 'dead-local', caseNo: '11/2026' },
            { id: 'live-local', caseNo: '12/2026' },
        ]);

        await syncExecutionBucket();

        expect(savedIds()).toEqual(['live-local']);
    });

    it('leaves dossiers that were never deleted untouched', async () => {
        getExecutionFiles.mockResolvedValue([{ id: 'a', caseNo: '1/2026' }]);
        loadAsync.mockResolvedValue([{ id: 'b', caseNo: '2/2026' }]);

        await syncExecutionBucket();

        expect(savedIds().sort()).toEqual(['a', 'b']);
    });
});
