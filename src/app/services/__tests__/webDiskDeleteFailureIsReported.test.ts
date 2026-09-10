/**
 * حذفٌ لا يبلغ القرص يُبلَّغ — على IndexedDB حقيقية.
 *
 * `675bf0f3` أصلح أربعة مسارات صامتة في `webDbDeleteItem` وشُحن **باستثناءٍ معلن** على
 * البند ١١، ونصُّه في رسالته: «الدالّة تبدأ بـ`if (import.meta.env.VITEST)` فلا اختبار
 * يبلغ ما تُصلحه»، وقاس حينها أن `fake-indexeddb` غير مثبَّتة. ثُبّتت في `f27e5f74`،
 * وصار للقرص مفتاح اشتراكٍ لكل ملف — فهذا الملف يُغلق الاستثناء.
 *
 * **ولماذا يهمّ هذا تحديداً:** `deleteItem` تمسح المرآة والكاش أوّلاً ثم تنتظر
 * `webDbDeleteItem`. فإن أُجهضت معاملة الحذف وعادت صامتة، تقول الواجهة إن الإضبارة
 * حُذفت، والقرص ما زال يحملها، فيُعيدها الإقلاع التالي. وحذفُ إضبارة فعلُ سرّية —
 * فإخبار المحامي بأنها زالت وهي باقية ادّعاءٌ كاذب عن سرّ مهنيّ، لا مجرّد إزعاج.
 *
 * الاشتراك هنا **لهذا الملف وحده**؛ رفعُه للمجموعة يقلب بيئة اثني عشر ألف اختبار دفعةً.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signals: Array<{ key: string; reason: string }> = [];
vi.mock('@/app/services/persistenceFailureSignal', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        signalPersistenceFailure: (key: string, reason: string) => {
            signals.push({ key, reason });
        },
    };
});

import SecureStoreService from '@/app/services/SecureStoreService';

type WebDisk = {
    webDbSetItem: (key: string, value: string) => Promise<boolean>;
    webDbGetItem: (key: string) => Promise<string | null>;
    webDbDeleteItem: (key: string) => Promise<void>;
};
const disk = SecureStoreService as unknown as WebDisk;

const KEY = 'hami:web-disk-probe';
let closeOptIn: () => void = () => undefined;

/** يُجهض كل معاملة تُفتح داخل النطاق — كما تفعل الحصّة الممتلئة */
function abortEveryTransaction(): () => void {
    const original = IDBDatabase.prototype.transaction;
    const spy = vi
        .spyOn(IDBDatabase.prototype, 'transaction')
        .mockImplementation(function (this: IDBDatabase, ...args: unknown[]) {
            const tx = (original as (...a: unknown[]) => IDBTransaction).apply(this, args);
            queueMicrotask(() => {
                try {
                    tx.abort();
                } catch {
                    /* أُتمّت قبل الإجهاض */
                }
            });
            return tx;
        } as never);
    return () => spy.mockRestore();
}

describe('قرص IndexedDB حقيقي — الحذف الذي لا يبلغه يُبلَّغ', () => {
    beforeEach(() => {
        closeOptIn = SecureStoreService.useRealIndexedDbForTests();
        signals.length = 0;
    });

    afterEach(() => {
        closeOptIn();
    });

    /* أوّلاً: إثبات أن المقعد يوصل فعلاً إلى القرص لا إلى الخريطة الوهمية */

    it('الاشتراك يوجّه الكتابة والقراءة إلى IndexedDB فعلاً', async () => {
        await expect(disk.webDbSetItem(KEY, 'hami_enc_v2:payload')).resolves.toBe(true);
        await expect(disk.webDbGetItem(KEY)).resolves.toBe('hami_enc_v2:payload');

        /* وبإغلاق الاشتراك تعود القراءة إلى القرص الوهميّ — فالمقروء أعلاه لم يكن منه */
        closeOptIn();
        await expect(disk.webDbGetItem(KEY)).resolves.toBeNull();
        closeOptIn = SecureStoreService.useRealIndexedDbForTests();
    });

    it('إجهاض معاملة الحذف يُبلَّغ، ولا يعود كأنه نجح', async () => {
        await disk.webDbSetItem(KEY, 'hami_enc_v2:still-here');
        signals.length = 0;

        const restore = abortEveryTransaction();
        try {
            await disk.webDbDeleteItem(KEY);
        } finally {
            restore();
        }

        expect(signals.map((s) => s.reason)).toContain('transaction-failed');
        expect(signals.every((s) => s.key === KEY)).toBe(true);
        /* والمفتاح ما زال على القرص فعلاً — وهذا هو الضرر الذي كان يُبتلع */
        await expect(disk.webDbGetItem(KEY)).resolves.toBe('hami_enc_v2:still-here');
    });

    /* الضابط: لا بلاغ حيث لا فشل — والحذف الناجح يمحو فعلاً */

    it('ضابط — الحذف الناجح صامت، والمفتاح يزول من القرص', async () => {
        await disk.webDbSetItem(KEY, 'hami_enc_v2:doomed');
        signals.length = 0;

        await disk.webDbDeleteItem(KEY);

        expect(signals).toEqual([]);
        await expect(disk.webDbGetItem(KEY)).resolves.toBeNull();
    });
});
