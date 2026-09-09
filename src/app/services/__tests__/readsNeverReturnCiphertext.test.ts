/**
 * ثابتٌ واحد لا يقبل التنصيف: **لا قراءة تُرجع نصّاً مشفَّراً على أنه بيانات.**
 *
 * 71fd49b1 أصلح `getItemSync` — «تُرجع ما في كاش الفكّ قبل أن تنظر إلى بادئة
 * التشفير» — وترك `getItem` على العطل نفسه حرفياً، لأن الاختبار الذي كشفه
 * (`dossierTombstonesUnreadFailClosed`) يستعمل المتزامنة وحدها.
 *
 * والبذر هنا بمساعد النواة نفسه `poisonMemoryMirrorForTests` («محاكاة التسميم
 * القديم») لا بترتيب اصطناعي، فالحالة هي الحالة التي بُني الحارس لها.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

const CIPHERTEXT = 'hami_enc_v2:opaque-payload';
const TOMBSTONES = 'hami:lawsuit:dossier-tombstones:v1';

describe('القراءتان لا تُرجعان ciphertext', () => {
    beforeEach(async () => {
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
    });

    it('getItem — التوأم غير المتزامن', async () => {
        SecureStoreService.poisonMemoryMirrorForTests(TOMBSTONES, CIPHERTEXT);
        expect(await SecureStoreService.getItem(TOMBSTONES)).toBeNull();
    });

    it('getItemSync — وهو ما أُصلح سابقاً، يبقى مُصلَحاً', () => {
        SecureStoreService.poisonMemoryMirrorForTests(TOMBSTONES, CIPHERTEXT);
        expect(SecureStoreService.getItemSync(TOMBSTONES)).toBeNull();
    });

    /*
     * ضابط الاتجاه المعاكس: قيمة سليمة في الكاش تُقرأ من المسارين. بلاه يمرّ
     * الإصلاح لو صار «أرجِع null دائماً» — وذلك يُعمي القراءة كلّها.
     */
    it('ضابط — النصّ السليم يُقرأ من المسارين', async () => {
        await SecureStoreService.setItem('lawyer_notes', '[{"id":"real"}]');

        expect(SecureStoreService.getItemSync('lawyer_notes')).toBe('[{"id":"real"}]');
        expect(await SecureStoreService.getItem('lawyer_notes')).toBe('[{"id":"real"}]');
    });
});
