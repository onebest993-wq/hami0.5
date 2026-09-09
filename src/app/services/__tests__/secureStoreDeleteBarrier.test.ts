/**
 * حاجز الحذف — كتابة أُطلقت قبل الحذف يجب ألّا تهبط بعده فتُحييه.
 *
 * العطل الأصلي: `setItemSync` يجدول كتابة دائمة ولا ينتظرها، فإن حُذف المفتاح قبل
 * هبوطها نُفِّذت بعده وأعادت القيمة المحذوفة. والأثر عملي لا نظري — محامٍ يعدّل
 * إضبارة ثم يحذفها فتعود بلا رسالة.
 *
 * وللكتابة أربعة مسارات، وكلٌّ منها كان يتجاوز الحاجز في حينه:
 *
 *   - الطابور (`setItemSync` → `queueDurableSetItem`)
 *   - `applyVerifiedEmptyOverwrite` بفرعيه — كانا يستدعيان `setItem` مباشرة
 *   - `void setItem` من مستدعٍ خارج الملف (`LocalStorageRepository.flushKey`)
 *
 * والضوابط الثلاثة الأخيرة تحرس الاتجاه المعاكس: حاجزٌ يُسقط كتابة مشروعة أسوأ من
 * غياب الحاجز، فبدل إحياء محذوف يضيع محفوظ.
 *
 * التفصيل: `secureStoreDeleteBarrier.ts` و `hami-audit/FINDING-012`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { markKeyDeleted } from '@/app/services/secureStoreDeleteBarrier';

/** يكفي لهبوط الكتابة المؤجّلة لو لم يُسقطها الحاجز */
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

describe('حاجز الحذف — الحذف نهائي مهما كان مسار الكتابة', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
    });

    it('الكتابة عبر الطابور لا تعود بعد الحذف', async () => {
        SecureStoreService.setItemSync('barrier:queued', '{"x":1}');
        await SecureStoreService.deleteItem('barrier:queued');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:queued')).toBeNull();
    });

    it('applyVerifiedEmptyOverwrite لا تعود بعد الحذف', async () => {
        SecureStoreService.applyVerifiedEmptyOverwrite('barrier:verified', '{"x":1}');
        await SecureStoreService.deleteItem('barrier:verified');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:verified')).toBeNull();
    });

    it('setItem المباشرة بلا انتظار لا تعود بعد الحذف', async () => {
        void SecureStoreService.setItem('barrier:direct', '{"x":1}');
        await SecureStoreService.deleteItem('barrier:direct');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:direct')).toBeNull();
    });

    it('deleteItemSync كذلك — وهو المسار الذي يسلكه سطح الواجهة', async () => {
        SecureStoreService.setItemSync('barrier:sync', '{"x":1}');
        SecureStoreService.deleteItemSync('barrier:sync');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:sync')).toBeNull();
    });

    it('كتابة بعد الحذف تثبت — الحاجز لا يُسقط المشروع', async () => {
        void SecureStoreService.setItem('barrier:rewrite', '{"old":1}');
        await SecureStoreService.deleteItem('barrier:rewrite');
        await SecureStoreService.setItem('barrier:rewrite', '{"new":2}');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:rewrite')).toBe('{"new":2}');
    });

    it('حذف مفتاح لا يُسقط كتابة مفتاح آخر', async () => {
        SecureStoreService.setItemSync('barrier:other', '{"z":9}');
        const write = SecureStoreService.setItem('barrier:kept', '{"f":1}');
        await SecureStoreService.deleteItem('barrier:other');
        await write;
        await settle();
        expect(SecureStoreService.getItemSync('barrier:kept')).toBe('{"f":1}');
        expect(SecureStoreService.getItemSync('barrier:other')).toBeNull();
    });

    it('كتابة عادية بلا أيّ حذف تمرّ كما كانت', async () => {
        await SecureStoreService.setItem('barrier:plain', '{"g":1}');
        await settle();
        expect(SecureStoreService.getItemSync('barrier:plain')).toBe('{"g":1}');
    });

    /*
     * حذفٌ جماعي أثناء كتابة طائرة — وهو ما يقع فعلاً في «امسح كل بياناتي» وحذف
     * الحساب: `listKeys()` ثم `deleteItem` لكل مفتاح على الجهاز، وإضابير التنفيذ
     * وحدها مفتاحٌ لكل ملف. وكان سقف الـ٢٥٦ بإزاحة الأقدم يُسقط مدخل الضحية
     * فتقرأ الكتابة صفراً عند الالتزام فتهبط — **فيعود المحذوف أثناء المحو نفسه**.
     */
    it('حذفٌ جماعي أثناء كتابة طائرة لا يُنسي الحاجز مفتاحها', async () => {
        const pending = SecureStoreService.setItem('barrier:victim', '{"x":1}');
        SecureStoreService.deleteItemSync('barrier:victim');
        for (let i = 0; i < 300; i += 1) markKeyDeleted(`barrier:bulk-${i}`);
        await pending;
        await settle();
        expect(SecureStoreService.getItemSync('barrier:victim')).toBeNull();
    });

    /* الضابط: العدد وحده لا يُسقط شيئاً — بحذفٍ واحد كان يمرّ أصلاً */
    it('والضابط — حذفٌ واحد بين الالتقاط والالتزام يبقى نهائياً', async () => {
        const pending = SecureStoreService.setItem('barrier:victim-one', '{"x":1}');
        SecureStoreService.deleteItemSync('barrier:victim-one');
        markKeyDeleted('barrier:bulk-single');
        await pending;
        await settle();
        expect(SecureStoreService.getItemSync('barrier:victim-one')).toBeNull();
    });
});
