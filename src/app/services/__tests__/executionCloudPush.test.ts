import { beforeEach, describe, expect, it } from 'vitest';
import { selectExecutionRowsToPush } from '@/app/services/executionCloudPush';
import { markExecutionDossierTombstone } from '@/app/utils/executionDossierTombstones';
import {
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('selectExecutionRowsToPush', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        bindExecutionFilesStorageOwner('push-user');
    });

    it('يدفع الصف المحلي غير الموجود في السحابة', () => {
        const local = [{ id: 'a', updatedAt: '2026-01-02T00:00:00.000Z' }];
        const cloud: unknown[] = [];
        expect(selectExecutionRowsToPush(local, cloud)).toHaveLength(1);
    });

    it('يدفع الصف المحلي الأحدث من السحابة', () => {
        const local = [{ id: 'a', updatedAt: '2026-01-03T00:00:00.000Z' }];
        const cloud = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' }];
        expect(selectExecutionRowsToPush(local, cloud)).toHaveLength(1);
    });

    it('يتجاهل tombstone والأقدم محلياً', () => {
        markExecutionDossierTombstone('dead');
        const local = [
            { id: 'dead', updatedAt: '2026-01-05T00:00:00.000Z' },
            { id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
        ];
        const cloud = [{ id: 'old', updatedAt: '2026-01-02T00:00:00.000Z' }];
        expect(selectExecutionRowsToPush(local, cloud)).toEqual([]);
    });
});
