/**
 * كتابةٌ يُعيد `setItem` إدراجها تُعدّ إخفاقاً — وإلا لم يُستسلم عنها أبداً.
 *
 * `setItem` لا ترمي لمفتاحٍ ليس `encrypt-or-fail`: تُعيد إدراجه في طابور التأجيل من
 * داخل `catch` الخاص بها **ثم تعود بنجاح**. فكان الطابور يقرأ ذلك نجاحاً، فيمحو
 * ميزانية المفتاح ولا يعدّ إخفاقاً — أي أن `MAX_WRITE_FAILURE_ATTEMPTS` و
 * `reportGivingUp` **لا تسريان على ذلك الصنف من المفاتيح إطلاقاً**.
 *
 * قِيس قبل الإصلاح على `lawyer_notes`: **ثلاث عشرة جولة متتالية، صفر بلاغ**. وهو
 * الصمت نفسه الذي أُضيف `reportGivingUp` في `fac77eac` ليكسره — طُبّق على المسار الذي
 * يرمي، وغاب عن المسار الذي لا يرمي.
 *
 * وأثره على المحامي: ملاحظاته تفشل كتابتها، فتُعاد المحاولة بلا حدّ وبلا أن يعرف أحد —
 * لا `hasPersistenceFailed()` ولا الرصد. واختبارات هذه الوحدة لا تراه لأن مضيفها
 * المزيَّف يرمي مباشرةً، فلا يسلك مسار `setItem`. فالمضيف هنا يستعمل **`setItem`
 * الإنتاجية نفسها**.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    configureCryptoDeferred,
    flushCryptoDeferredWrites,
    resetCryptoDeferredForTests,
    type CryptoDeferredHost,
} from '@/app/services/secureStoreCryptoDeferred';

/** ميزانية فشل الكتابة في الوحدة */
const MAX_WRITE_FAILURE_ATTEMPTS = 8;
const KEY = 'lawyer_notes';

function installRealPersistHost() {
    const delays: number[] = [];
    const gaveUp: Array<[string, string]> = [];
    const host: CryptoDeferredHost = {
        /* الدالّة الإنتاجية — هي التي تُعيد الإدراج بنفسها */
        persist: (key, value) => SecureStoreService.setItem(key, value),
        shouldDropStaleWrite: () => false,
        atomicGateHeld: () => false,
        schedule: (_run, delayMs) => {
            delays.push(delayMs);
            return null;
        },
        reportError: () => undefined,
        reportGivingUp: (key, reason) => {
            gaveUp.push([key, reason]);
        },
    };
    configureCryptoDeferred(host);
    return { delays, gaveUp };
}

describe('إعادة الإدراج من setItem تُعدّ إخفاقاً', () => {
    beforeEach(() => {
        resetCryptoDeferredForTests();
        SecureStoreService.dropMemoryMirrorsForTests([KEY]);
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetCryptoDeferredForTests();
        SecureStoreService.dropMemoryMirrorsForTests([KEY]);
    });

    it('تشفيرٌ يفشل باستمرار يُستسلم عنه ويُبلَّغ — لا يُعاد إلى الأبد صامتاً', async () => {
        vi.spyOn(CryptoService, 'encryptData').mockRejectedValue(new Error('encrypt boom'));
        const { gaveUp } = installRealPersistHost();

        await SecureStoreService.setItem(KEY, '[{"n":1}]');
        for (let i = 0; i < MAX_WRITE_FAILURE_ATTEMPTS + 2; i += 1) {
            await flushCryptoDeferredWrites();
        }

        expect(gaveUp.length).toBeGreaterThan(0);
        expect(gaveUp[0][0]).toBe(KEY);
    });

    it('ولا يُستسلم قبل نفاد الميزانية', async () => {
        vi.spyOn(CryptoService, 'encryptData').mockRejectedValue(new Error('encrypt boom'));
        const { gaveUp } = installRealPersistHost();

        await SecureStoreService.setItem(KEY, '[{"n":1}]');
        for (let i = 0; i < MAX_WRITE_FAILURE_ATTEMPTS - 2; i += 1) {
            await flushCryptoDeferredWrites();
        }

        expect(gaveUp).toEqual([]);
    });

    /* الضابط: العدّ لا يُصيب كتابةً نجحت */

    it('ضابط — كتابةٌ تنجح لا تُعدّ إخفاقاً ولا يُبلَّغ عنها', async () => {
        /* زوجٌ عكسيّ يُرضي تحقّق الدورة في `encryptIfSensitive` فتنجح الكتابة فعلاً */
        vi.spyOn(CryptoService, 'encryptData').mockImplementation(async (v: string) => `C${v}`);
        vi.spyOn(CryptoService, 'decryptData').mockImplementation(async (c: string) => c.slice(1));
        const { gaveUp } = installRealPersistHost();

        await SecureStoreService.setItem(KEY, '[{"n":2}]');
        for (let i = 0; i < MAX_WRITE_FAILURE_ATTEMPTS + 2; i += 1) {
            await flushCryptoDeferredWrites();
        }

        expect(gaveUp).toEqual([]);
        expect(SecureStoreService.getItemSync(KEY)).toBe('[{"n":2}]');
    });
});
