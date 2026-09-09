/**
 * مقعد IndexedDB — أوّل إثبات أنه حقيقيّ.
 *
 * كل مسار IndexedDB في النواة كان **غير قابل للتشغيل** في الاختبار: لا
 * `indexedDB` في jsdom، فـ`openDatabase` تُرجع `null` دائماً وتسلك الشفرة فرع
 * `!db` وحده. ولذلك عاشت فيها أعطال (`FINDING-016` و`675bf0f3` و`5fba7bbc`)
 * تُعلَن استثناءات على البند ١١ بدل أن تُختبَر.
 *
 * `fake-indexeddb` تُثبَّت وتُستورَد **في الملف الذي يحتاجها** لا عالمياً: تفعيلها
 * لكل المجموعة يقلب سلوك اثني عشر ألف اختبار دفعةً واحدة، وذلك تغييرٌ يُقاس على
 * حدة لا يُمرَّر ضمناً.
 *
 * وهذه الحالات تُثبت المقعد نفسه — **لا أنّ النواة صارت تستعمله**. النواة ما زالت
 * وراء ١٩ بوّابة `import.meta.env.VITEST` تكتب على قرصٍ وهميّ متزامن، وفتحُ تلك
 * البوّابات هو البند التالي في `PLAN-تنطيق-مفاتيح-الدعاوى.md`.
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

const openDb = (name: string): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kv');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

describe('مقعد IndexedDB', () => {
    it('الواجهة موجودة فعلاً — وكانت غائبة قبل التثبيت', () => {
        expect(typeof indexedDB).toBe('object');
        expect(typeof indexedDB.open).toBe('function');
    });

    it('دورة كاملة: فتح ← كتابة ← قراءة', async () => {
        const db = await openDb('hami-seam-probe');
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').put('hami_enc_v2:payload', 'lawyer_files');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        const read = await new Promise<unknown>((resolve, reject) => {
            const request = db.transaction('kv', 'readonly').objectStore('kv').get('lawyer_files');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        db.close();

        expect(read).toBe('hami_enc_v2:payload');
    });

    /*
     * الحالة التي كانت مستحيلة: **إجهاض معاملة**. مسارات `onabort` في
     * `webDbSetItem` و`webDbDeleteItem` و`persistKeyToPersistentStore` أُعلنت
     * استثناءً على البند ١١ لأن لا سبيل إلى تنفيذها. صارت الآن ممكنة.
     */
    it('إجهاض معاملة يُنفَّذ فعلاً — وهو ما تعذّر إثباته في ثلاثة إصلاحات', async () => {
        const db = await openDb('hami-seam-abort');
        const aborted = await new Promise<boolean>((resolve) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.onabort = () => resolve(true);
            tx.oncomplete = () => resolve(false);
            tx.objectStore('kv').put('value', 'key');
            tx.abort();
        });
        db.close();

        expect(aborted).toBe(true);
    });
});
