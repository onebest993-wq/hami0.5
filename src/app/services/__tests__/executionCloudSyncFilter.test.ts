import { beforeEach, describe, expect, it } from 'vitest';
import { filterTombstonedExecutionSyncRows } from '@/app/services/executionCloudSyncFilter';
import { markExecutionDossierTombstone } from '@/app/utils/executionDossierTombstones';
import {
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('filterTombstonedExecutionSyncRows', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        bindExecutionFilesStorageOwner('lawyer-sync-1');
    });

    it('يستبعد الإضابير المؤشرة بـ tombstone', () => {
        markExecutionDossierTombstone('dead-1');
        const filtered = filterTombstonedExecutionSyncRows([
            { id: 'alive-1', caseNo: '1/2026' },
            { id: 'dead-1', caseNo: '2/2026' },
            { id: 'alive-2', caseNo: '3/2026' },
        ]);
        expect(filtered.map((r) => (r as { id: string }).id)).toEqual(['alive-1', 'alive-2']);
    });

    it('يتجاهل الصفوف بلا معرّف', () => {
        expect(filterTombstonedExecutionSyncRows([{ caseNo: 'x' }, null, 'bad'])).toEqual([]);
    });
});
