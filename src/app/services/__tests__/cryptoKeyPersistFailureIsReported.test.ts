/**
 * حفظُ المفتاح الرئيسي إن أخفق، يجب أن يُبلَّغ — لا أن يعود كأنه نجح.
 *
 * كانت `persistKeyToPersistentStore` تُرجع `void` وتبتلع خمسة مسارات فشل: القاعدة
 * لا تُفتح · `tx.onerror` · `tx.onabort` · الاستثناء · وحمولة فارغة. فلا سبيل لأيّ
 * مستدعٍ أن يعرف.
 *
 * **وسلسلة الأثر ليست نظرية:** يُسكّ مفتاح ⇐ يفشل حفظه صامتاً ⇐ الجلسة تعمل تماماً
 * لأن المفتاح في الذاكرة ⇐ يُنشئ المحامي إضابير طوال اليوم ⇐ يُغلق التطبيق فيزول
 * المفتاح ⇐ الإقلاع التالي لا يجده، **والسلسلة ترفض سكّ بديل** لوجود ciphertext
 * على القرص (وهو رفضٌ صائب). فيصير عمل يومٍ كامل غير قابل للقراءة، بلا رسالة.
 *
 * و`SecureStoreService.webDbSetItem` يُبلّغ عن الحالات نفسها منذ البداية — فالدرس
 * كان مُتعلَّماً في ملفٍ ومنسيّاً في الآخر.
 *
 * وشاهدٌ من الملف نفسه عند `openCryptoDatabase`: «`onblocked` ≠ فشل. إرجاع `null`
 * هنا **كان يسكت persist فيُعمَى القرص بعد Reload**» — أي أن هذا الصنف أصاب
 * المشروع فعلاً مرّة، فعُولجت حالةٌ واحدة وبقي الصمت العام.
 *
 * وحذف سجلّ المفتاح المشترك يُبلَّغ كذلك، وأثره **أمنيّ**: السجلّ الذي لا يُمحى قد
 * يرثه حساب لاحق على الجهاز نفسه.
 *
 * **كيف يُقاس هنا:** بيئة jsdom بلا `indexedDB`، و`openCryptoDatabase` تُرجع `null`
 * عندها (السطر ١٤٩) — فالمسار المُصلَح هو نفسه الذي يسلكه الاختبار.
 *
 * التفصيل: `hami-audit/FINDING-019`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import {
    __resetPersistenceFailureSignalForTests,
    getLastPersistenceFailure,
    hasPersistenceFailed,
} from '@/app/services/persistenceFailureSignal';

const persistKey = () =>
    (
        CryptoService as unknown as { persistKeyToPersistentStore: () => Promise<void> }
    ).persistKeyToPersistentStore();

const deleteRecord = (id: string) =>
    (
        CryptoService as unknown as { deleteMasterKeyRecord: (recordId: string) => Promise<void> }
    ).deleteMasterKeyRecord(id);

describe('فشل حفظ المفتاح الرئيسي يُبلَّغ ولا يُبتلع', () => {
    beforeEach(() => {
        __resetPersistenceFailureSignalForTests();
    });

    it('تعذّر فتح قاعدة المفاتيح يُبلَّغ عند حفظ المفتاح', async () => {
        expect(typeof globalThis.indexedDB).toBe('undefined');
        await CryptoService.initialize('test-password-123');

        await persistKey();

        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.reason).toBe('db-unavailable');
    });

    it('وكذلك عند حذف سجلّ مفتاح — والصمت هنا أثره أمنيّ', async () => {
        await deleteRecord('master-key-v3');

        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.key).toBe('master-key-v3');
        expect(getLastPersistenceFailure()?.reason).toBe('db-unavailable');
    });

    /* ضابط: لا بلاغ حيث لا فشل */

    it('ضابط — لا بلاغ ما لم يقع فشل', () => {
        expect(hasPersistenceFailed()).toBe(false);
        expect(getLastPersistenceFailure()).toBeNull();
    });
});
