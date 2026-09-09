/**
 * جلسةٌ بلا مفتاح فوق بياناتٍ مشفَّرة يجب ألّا تمرّ صامتة.
 *
 * السيناريو ليس نادراً: حسابٌ ثانٍ على الجهاز نفسه. `lawyer_files` مفتاحٌ غير
 * منطَّق بمستخدم، وبيانات الأوّل تبقى بعد خروجه منذ 279fa88c، وفحص «هل على القرص
 * ciphertext؟» في سلسلة الاستعادة يصدق **بلا نسبةٍ إلى مالك** — فيُرفض سكّ مفتاح
 * للثاني. والرفض صحيح (السكّ يُعمي بيانات الأوّل)، لكنّ ما بعده كان صمتاً كاملاً:
 * الجلسة تعمل، والحفظ يُبتلع، ولا رسالة.
 *
 * هنا يُقاس أن الحالة صارت **مرصودة**. ولا يُقاس أنها عولجت — لم تُعالَج، وذلك
 * قرار منتج مذكور في `hami-audit`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    getLastPersistenceFailure,
    hasPersistenceFailed,
    __resetPersistenceFailureSignalForTests,
} from '@/app/services/persistenceFailureSignal';

describe('جلسة بلا مفتاح فوق ciphertext', () => {
    beforeEach(async () => {
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
        CryptoService.destroy();
        __resetPersistenceFailureSignalForTests();
    });

    it('تُبلَّغ حين يُرفض سكّ مفتاح فوق بيانات مشفَّرة قائمة', async () => {
        await CryptoService.initialize('owner-pw');
        await SecureStoreService.setItem('lawyer_files', '[{"id":"dossier-A"}]');
        expect((await SecureStoreService.peekRawFromDisk('lawyer_files'))?.startsWith('hami_enc_v2:')).toBe(
            true,
        );

        /* جلسة تالية لا تملك ما يفكّ ما على القرص */
        CryptoService.destroy();
        __resetPersistenceFailureSignalForTests();
        await CryptoService.initialize('a-different-secret');

        expect(CryptoService.hasMasterKey()).toBe(false);
        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.reason).toBe('encrypt-or-write-failed');
    });

    /*
     * ضابط: جهازٌ نظيف يسكّ مفتاحه ولا يُبلَّغ عن انعدامه. بلاه يمرّ «الإصلاح» لو
     * صار يُبلّغ في كل إقلاع — وإنذارٌ يقع دائماً لا يُقرأ أبداً.
     *
     * ولا يُفحص `hasPersistenceFailed()` هنا لأنه **صادق دائماً تحت الاختبار**:
     * لا `indexedDB` في jsdom، فحفظ سجلّ المفتاح يُبلّغ `db-unavailable` في كل
     * إقلاع (وهو الإصلاح 5fba7bbc يعمل). فالتمييز بالسبب: هذا الإصلاح وحده يُنتج
     * `encrypt-or-write-failed` من هذا المسار.
     */
    it('ضابط — إقلاعٌ نظيف يسكّ مفتاحاً ولا يُبلّغ انعدامه', async () => {
        await CryptoService.initialize('fresh-device-pw');

        expect(CryptoService.hasMasterKey()).toBe(true);
        expect(getLastPersistenceFailure()?.reason).not.toBe('encrypt-or-write-failed');
    });
});
