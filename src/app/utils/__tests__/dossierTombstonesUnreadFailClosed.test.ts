import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_DOSSIER_TOMBSTONES_KEY,
    commitLawsuitDossierTombstone,
    ensureLawsuitDossierTombstonesReadable,
    markLawsuitDossierTombstone,
} from '@/app/utils/lawsuitDossierTombstones';
import {
    commitExecutionDossierTombstones,
    ensureExecutionDossierTombstonesReadable,
    listExecutionDossierTombstoneIds,
    markExecutionDossierTombstone,
} from '@/app/utils/executionDossierTombstones';
import {
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
} from '@/app/utils/executionFilesStorage';

describe('شواهد الحذف unread ليست قائمة فارغة', () => {
    beforeEach(async () => {
        // كتابة مؤجّلة من اختبار سابق تعود فوق المفتاح بعد المسح وتُفسد العزل
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        bindExecutionFilesStorageOwner('tomb-unread-1');
    });

    it('غياب الشاهد قابل للقراءة — لا حذف سابق', async () => {
        expect(await ensureLawsuitDossierTombstonesReadable()).toBe(true);
        expect(await ensureExecutionDossierTombstonesReadable()).toBe(true);
    });

    it('أصل مشفّر بارد للدعاوى لا يُعدّ مقروءاً', async () => {
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, 'hami_enc_v2:lawsuit-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
        expect(await ensureLawsuitDossierTombstonesReadable()).toBe(false);
        expect(SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
    });

    it('أصل مشفّر بارد للتنفيذ لا يُعدّ مقروءاً', async () => {
        const scoped = 'hami:execution:dossier-tombstones:v1:tomb-unread-1';
        SecureStoreService.setItemSync(scoped, 'hami_enc_v2:exec-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(scoped)).toBe(true);
        expect(await ensureExecutionDossierTombstonesReadable()).toBe(false);
    });

    it('mark دعاوى فوق ciphertext بارد يرفض ولا يزرع قائمة جزئية في الذاكرة', () => {
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, 'hami_enc_v2:lawsuit-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(markLawsuitDossierTombstone('new-dead')).toBe(false);
        expect(SecureStoreService.getItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(null);
        expect(SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
    });

    it('mark تنفيذ فوق ciphertext بارد يرفض', () => {
        const scoped = 'hami:execution:dossier-tombstones:v1:tomb-unread-1';
        SecureStoreService.setItemSync(scoped, 'hami_enc_v2:exec-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(markExecutionDossierTombstone('dead-exec')).toBe(false);
        expect(SecureStoreService.isUnreadSync(scoped)).toBe(true);
    });

    it('commit دعاوى فوق مفتاح بارد يفكّ ثم يُثبّت بلا فقد الشواهد السابقة', async () => {
        await SecureStoreService.deleteItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
        await SecureStoreService.setItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY, '["old-dead"]');
        SecureStoreService.clearDecryptedMemoryCache();
        // المفتاح بارد: mark المتزامن وحده يستسلم
        expect(markLawsuitDossierTombstone('new-dead')).toBe(false);

        expect(await commitLawsuitDossierTombstone('new-dead')).toBe(true);

        const stored: unknown = JSON.parse(
            (await SecureStoreService.getItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY)) ?? '[]',
        );
        expect(stored).toEqual(expect.arrayContaining(['old-dead', 'new-dead']));
    });

    it('commit دعاوى فوق ciphertext لا يُفكّ يبقى fail-closed', async () => {
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, 'hami_enc_v2:lawsuit-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(await commitLawsuitDossierTombstone('new-dead')).toBe(false);
        expect(SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
    });

    it('commit تنفيذ يدمج الدفعة فوق الشواهد القائمة', async () => {
        const scoped = 'hami:execution:dossier-tombstones:v1:tomb-unread-1';
        await SecureStoreService.deleteItem(scoped);
        await SecureStoreService.setItem(scoped, '["old-exec"]');

        expect(await commitExecutionDossierTombstones(['dead-exec', 'dead-exec-2'])).toBe(true);

        expect(listExecutionDossierTombstoneIds()).toEqual(
            expect.arrayContaining(['old-exec', 'dead-exec', 'dead-exec-2']),
        );
    });

    it('setItemSync يرفض كتابة باردة فوق شواهد مشفّرة', () => {
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, 'hami_enc_v2:lawsuit-tomb-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(
            SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, '["only-new"]'),
        ).toBe(false);
        expect(SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
    });
});
