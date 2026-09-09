/**
 * عقد الخروج بنطاق الجلسة — على الخدمات الحقيقية لا على محاكاة.
 *
 * `applicationWipe.test.ts` يُحاكي `SecureStoreService` كلّه، فيُثبت **من يُستدعى**
 * ولا يُثبت **ماذا يحدث للبيانات**. وهذا الفرق هو ما أخفى عطلين في 16d18663:
 *
 *   ١) `flushHeavyPersistPending()` تُطلق الكتابة ولا تنتظرها، ثم يمحو
 *      `CryptoService.destroy()` المفتاح بعد طورين — فتبلغ الكتابةُ التشفيرَ بلا
 *      مفتاح، وتُؤجَّل في طابور لا يُفرَّغ بعد الخروج. أي أن الـflush الذي أُضيف
 *      **ليحفظ** آخر تعديل كان يضمن ضياعه.
 *   ٢) `clearDecryptedMemoryCache` تمسح كاش الفكّ وحده، والمرآة `webFallbackStore`
 *      تحمل ما كتبه `setItemSync` **نصّاً صريحاً** حتى تهبط الكتابة. فبقي نصّ
 *      الحساب الأول مقروءاً بعد خروجه.
 *
 * فالحالتان هنا تقيسان القرص والذاكرة بعد الدالّة الإنتاجية نفسها.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

async function sessionLogout(): Promise<void> {
    const { purgeLocalApplicationData } = await import('@/app/services/settings/applicationWipe');
    await purgeLocalApplicationData('lawyer-1', undefined, {
        preserveLegalTerms: true,
        scope: 'session',
    });
}

describe('خروج بنطاق الجلسة — يحفظ آخر تعديل ولا يترك نصّه', () => {
    beforeEach(async () => {
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
        CryptoService.destroy();
        await CryptoService.initialize('logout-contract-pw');
    });

    /*
     * ⚠️ **ضابط لا إثبات، ويُقال صراحةً.** يمرّ على الشفرة القديمة والجديدة معاً،
     * لأن `webDbSetItem` تحت VITEST تكتب على قرصٍ وهميّ **متزامن**
     * (`vitestDiskStore`)، فالكتابة تهبط دائماً داخل سلسلة الوعود نفسها ولا يمكن
     * لسباق «كتابة تصل بعد `CryptoService.destroy()`» أن يقع هنا أصلاً. وعلى جهاز
     * حقيقي IndexedDB غير متزامنة فالسباق قائم بالبناء.
     *
     * فوظيفته هنا الاتجاه المعاكس: أن يكشف لو حوّل الانتظارُ الخروجَ إلى مسارٍ لا
     * يكتب. والسباق نفسه يُغلق بالترتيب لا بهذه الحالة — انظر رسالة الـcommit.
     */
    it('ضابط — حين يعود الخروج يكون آخر تعديل على القرص', async () => {
        expect(SecureStoreService.setItemSync('lawyer_notes', '[{"id":"last-edit"}]')).toBe(true);

        await sessionLogout();

        const onDisk = await SecureStoreService.peekRawFromDisk('lawyer_notes');
        expect(onDisk).not.toBeNull();
        expect(onDisk?.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    });

    it('ولا يبقى نصّه الصريح في الذاكرة للحساب التالي', async () => {
        expect(SecureStoreService.setItemSync('lawyer_notes', '[{"id":"last-edit"}]')).toBe(true);

        await sessionLogout();
        await settle();

        expect(SecureStoreService.getItemSync('lawyer_notes')).toBeNull();
    });

    /*
     * ضابط الاتجاه المعاكس: الإسقاط محصور بالمفاتيح الحسّاسة. مفتاحٌ غير حسّاس
     * (`lawyer_theme` ليس في قائمة التشفير) يبقى في المرآة — وإلا لكان الإصلاح
     * مسحاً عامّاً للذاكرة متخفّياً في صورة إغلاق تسريب.
     */
    it('ضابط — المفاتيح غير الحسّاسة لا تُمسّ', async () => {
        expect(SecureStoreService.setItemSync('lawyer_theme', '"dark"')).toBe(true);

        await sessionLogout();
        await settle();

        expect(SecureStoreService.getItemSync('lawyer_theme')).toBe('"dark"');
    });
});
